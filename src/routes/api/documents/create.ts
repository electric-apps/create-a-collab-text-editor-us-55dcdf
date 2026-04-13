import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { generateTxId, parseDates } from "@/db/utils"
import { documentInsertSchema } from "@/db/zod-schemas"

const handler = async ({ request }: { request: Request }) => {
	const parsed = documentInsertSchema.safeParse(parseDates(await request.json()))
	if (!parsed.success) {
		return Response.json({ error: parsed.error.format() }, { status: 400 })
	}
	const { id, title } = parsed.data

	let txid: number
	const result = await db.transaction(async (tx) => {
		txid = await generateTxId(tx)
		const [doc] = await tx
			.insert(documents)
			.values({ id, title })
			.returning()
		return doc
	})

	return Response.json({ id: result.id, txid: txid! })
}

export const Route = createFileRoute("/api/documents/create")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: { handlers: { POST: handler } },
})
