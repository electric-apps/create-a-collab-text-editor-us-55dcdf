import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { generateTxId } from "@/db/utils"
import { eq } from "drizzle-orm"
import { z } from "zod/v4"

const patchBodySchema = z.object({ title: z.string().min(1) })

const handlePatch = async ({ request, params }: { request: Request; params: { docId: string } }) => {
	const parsed = patchBodySchema.safeParse(await request.json())
	if (!parsed.success) {
		return Response.json({ error: parsed.error.format() }, { status: 400 })
	}

	let txid: number
	await db.transaction(async (tx) => {
		txid = await generateTxId(tx)
		await tx
			.update(documents)
			.set({ title: parsed.data.title, updated_at: new Date() })
			.where(eq(documents.id, params.docId))
	})

	return Response.json({ txid: txid! })
}

const handleDelete = async ({ params }: { params: { docId: string } }) => {
	let txid: number
	await db.transaction(async (tx) => {
		txid = await generateTxId(tx)
		await tx.delete(documents).where(eq(documents.id, params.docId))
	})

	return Response.json({ txid: txid! })
}

export const Route = createFileRoute("/api/documents/$docId")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			PATCH: handlePatch,
			DELETE: handleDelete,
		},
	},
})
