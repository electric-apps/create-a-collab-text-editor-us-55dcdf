import { createCollection } from "@tanstack/react-db"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { absoluteApiUrl } from "@/lib/client-url"
import { documentSelectSchema } from "@/db/zod-schemas"

export const documentsCollection = createCollection(
	electricCollectionOptions({
		id: "documents",
		schema: documentSelectSchema,
		getKey: (row) => row.id,
		shapeOptions: {
			url: absoluteApiUrl("/api/documents/shape"),
			parser: {
				timestamptz: (date: string) => new Date(date),
			},
		},
		onInsert: async ({ transaction }) => {
			const { modified: doc } = transaction.mutations[0]
			const res = await fetch("/api/documents/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(doc),
			})
			if (!res.ok) throw new Error(`Request failed: ${res.status}`)
			const { txid } = await res.json()
			return { txid }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: doc, key } = transaction.mutations[0]
			const res = await fetch(`/api/documents/${key}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: doc.title }),
			})
			if (!res.ok) throw new Error(`Request failed: ${res.status}`)
			const { txid } = await res.json()
			return { txid }
		},
		onDelete: async ({ transaction }) => {
			const { key } = transaction.mutations[0]
			const res = await fetch(`/api/documents/${key}`, {
				method: "DELETE",
			})
			if (!res.ok) throw new Error(`Request failed: ${res.status}`)
			const { txid } = await res.json()
			return { txid }
		},
	}),
)
