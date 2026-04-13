import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { generateTxId } from "@/db/utils"
import { parseDates } from "@/db/utils"

const handler = async ({ request }: { request: Request }) => {
	const raw = parseDates(await request.json())
	const { created_at, updated_at, ...data } = raw

	let txid: number
	const result = await db.transaction(async (tx) => {
		txid = await generateTxId(tx)
		const [doc] = await tx
			.insert(documents)
			.values({ id: data.id, title: data.title })
			.returning()
		return doc
	})

	return Response.json({ id: result.id, txid: txid! })
}

export const Route = createFileRoute("/api/documents/create")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: { handlers: { POST: handler } },
})
