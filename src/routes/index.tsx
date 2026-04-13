import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useLiveQuery } from "@tanstack/react-db"
import { documentsCollection } from "@/db/collections/documents"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Plus, FileText } from "lucide-react"

export const Route = createFileRoute("/")({
	ssr: false,
	component: HomePage,
})

function HomePage() {
	const navigate = useNavigate()
	const { data: documents } = useLiveQuery((q) =>
		q.from({ doc: documentsCollection }).orderBy(({ doc }) => doc.updated_at, "desc"),
	)

	const handleNewDocument = async () => {
		const id = crypto.randomUUID()
		documentsCollection.insert({
			id,
			title: "Untitled",
			created_at: new Date(),
			updated_at: new Date(),
		})
		navigate({ to: "/doc/$docId", params: { docId: id } })
	}

	return (
		<main className="flex-1">
			<div className="container mx-auto max-w-5xl px-4 py-8">
				<div className="mb-8 flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-tight">Collab Editor</h1>
					<Button onClick={handleNewDocument} className="bg-[#d0bcff] text-[#1b1b1f] hover:bg-[#c4aef5]">
						<Plus className="mr-2 h-4 w-4" />
						New Document
					</Button>
				</div>

				{documents.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<FileText className="mb-4 h-12 w-12 text-muted-foreground" />
						<h2 className="text-xl font-semibold">No documents yet</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							Create your first document to get started.
						</p>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{documents.map((doc) => (
							<Card
								key={doc.id}
								className="cursor-pointer border-[#2a2c34] bg-card transition-colors hover:border-[#d0bcff]/30"
								onClick={() => navigate({ to: "/doc/$docId", params: { docId: doc.id } })}
							>
								<CardHeader className="pb-2">
									<CardTitle className="truncate text-lg font-medium">{doc.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-xs text-muted-foreground">
										Updated {formatRelativeDate(doc.updated_at)}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</main>
	)
}

function formatRelativeDate(date: Date): string {
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (seconds < 60) return "just now"
	if (minutes < 60) return `${minutes}m ago`
	if (hours < 24) return `${hours}h ago`
	if (days < 7) return `${days}d ago`
	return date.toLocaleDateString()
}
