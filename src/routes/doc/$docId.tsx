import { useState, useEffect, useRef, useCallback } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { YjsProvider } from "@durable-streams/y-durable-streams"
import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret"
import { absoluteApiUrl } from "@/lib/client-url"
import { documentsCollection } from "@/db/collections/documents"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
	ArrowLeft,
	Bold,
	Italic,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Quote,
	Minus,
} from "lucide-react"

export const Route = createFileRoute("/doc/$docId")({
	ssr: false,
	component: DocPage,
})

function getUserIdentity() {
	let name = localStorage.getItem("collab_user_name")
	let color = localStorage.getItem("collab_user_color")
	if (!name) {
		const adjectives = ["Swift", "Brave", "Calm", "Eager", "Wise", "Bold", "Keen", "Quick"]
		const nouns = ["Fox", "Owl", "Bear", "Wolf", "Hawk", "Deer", "Hare", "Lynx"]
		name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`
		localStorage.setItem("collab_user_name", name)
	}
	if (!color) {
		const hue = Math.floor(Math.random() * 360)
		color = `hsl(${hue}, 70%, 60%)`
		localStorage.setItem("collab_user_color", color)
	}
	return { name, color }
}

function DocPage() {
	const { docId } = Route.useParams()
	return <CollabEditor key={docId} docId={docId} />
}

function CollabEditor({ docId }: { docId: string }) {
	const navigate = useNavigate()
	const user = getUserIdentity()

	const [ydoc] = useState(() => new Y.Doc())
	const [awareness] = useState(() => {
		const aw = new Awareness(ydoc)
		aw.setLocalStateField("user", { name: user.name, color: user.color })
		return aw
	})
	const [provider] = useState(
		() =>
			new YjsProvider({
				doc: ydoc,
				baseUrl: absoluteApiUrl("/api/yjs"),
				docId,
				awareness,
			}),
	)

	useEffect(() => {
		return () => {
			provider.destroy()
			awareness.destroy()
			ydoc.destroy()
		}
	}, [provider, awareness, ydoc])

	const [synced, setSynced] = useState(false)
	useEffect(() => {
		const handler = (s: boolean) => {
			if (s) setSynced(true)
		}
		provider.on("synced", handler)
		return () => {
			provider.off("synced", handler)
		}
	}, [provider])

	// Awareness states for presence bar
	const [awarenessStates, setAwarenessStates] = useState<Map<number, Record<string, unknown>>>(new Map())
	useEffect(() => {
		const update = () => setAwarenessStates(new Map(awareness.getStates()))
		awareness.on("change", update)
		update()
		return () => {
			awareness.off("change", update)
		}
	}, [awareness])

	// Document title from collection
	const { data: docs } = useLiveQuery(
		(q) => q.from({ doc: documentsCollection }).where(({ doc }) => eq(doc.id, docId)),
		[docId],
	)
	const doc = docs?.[0]
	const [editingTitle, setEditingTitle] = useState(false)
	const [titleValue, setTitleValue] = useState("")
	const titleInputRef = useRef<HTMLInputElement>(null)

	const startEditingTitle = useCallback(() => {
		setTitleValue(doc?.title || "Untitled")
		setEditingTitle(true)
		setTimeout(() => titleInputRef.current?.focus(), 0)
	}, [doc?.title])

	const saveTitle = useCallback(() => {
		setEditingTitle(false)
		if (doc && titleValue.trim() && titleValue !== doc.title) {
			documentsCollection.update(doc.id, (draft) => {
				draft.title = titleValue.trim()
				draft.updated_at = new Date()
			})
		}
	}, [doc, titleValue])

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ undoRedo: false }),
			Collaboration.configure({ document: ydoc }),
			CollaborationCaret.configure({
				provider,
				user: { name: user.name, color: user.color },
			}),
		],
		editorProps: {
			attributes: {
				class: "prose prose-invert max-w-none min-h-[60vh] focus:outline-none px-4 py-4",
			},
		},
	})

	const presenceUsers = Array.from(awarenessStates.entries())
		.filter(([, state]) => state.user)
		.map(([clientId, state]) => ({
			clientId,
			...(state.user as { name: string; color: string }),
		}))

	return (
		<main className="flex-1">
			<div className="container mx-auto max-w-5xl px-4 py-6">
				{/* Header */}
				<div className="mb-6 flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/" })}
						className="text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>

					{editingTitle ? (
						<Input
							ref={titleInputRef}
							value={titleValue}
							onChange={(e) => setTitleValue(e.target.value)}
							onBlur={saveTitle}
							onKeyDown={(e) => {
								if (e.key === "Enter") saveTitle()
								if (e.key === "Escape") setEditingTitle(false)
							}}
							className="h-auto border-none bg-transparent p-0 text-xl font-semibold focus-visible:ring-0"
						/>
					) : (
						<h1
							className="cursor-pointer text-xl font-semibold hover:text-[#d0bcff]"
							onClick={startEditingTitle}
						>
							{doc?.title || "Untitled"}
						</h1>
					)}
				</div>

				{/* Presence bar */}
				{presenceUsers.length > 0 && (
					<div className="mb-4 flex items-center gap-2">
						{presenceUsers.map((u) => (
							<div
								key={u.clientId}
								className="flex items-center gap-1.5 rounded-full border border-[#2a2c34] bg-card px-3 py-1"
							>
								<div
									className="h-2.5 w-2.5 rounded-full"
									style={{ backgroundColor: u.color }}
								/>
								<span className="text-xs text-muted-foreground">{u.name}</span>
							</div>
						))}
					</div>
				)}

				{/* Editor */}
				{!synced ? (
					<div className="space-y-3">
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				) : (
					<div className="rounded-xl border border-[#2a2c34] bg-card">
						{/* Toolbar */}
						<div className="flex flex-wrap items-center gap-1 border-b border-[#2a2c34] px-3 py-2">
							<ToolbarButton
								icon={<Bold className="h-4 w-4" />}
								isActive={editor?.isActive("bold")}
								onClick={() => editor?.chain().focus().toggleBold().run()}
							/>
							<ToolbarButton
								icon={<Italic className="h-4 w-4" />}
								isActive={editor?.isActive("italic")}
								onClick={() => editor?.chain().focus().toggleItalic().run()}
							/>
							<div className="mx-1 h-5 w-px bg-[#2a2c34]" />
							<ToolbarButton
								icon={<Heading1 className="h-4 w-4" />}
								isActive={editor?.isActive("heading", { level: 1 })}
								onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
							/>
							<ToolbarButton
								icon={<Heading2 className="h-4 w-4" />}
								isActive={editor?.isActive("heading", { level: 2 })}
								onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
							/>
							<ToolbarButton
								icon={<Heading3 className="h-4 w-4" />}
								isActive={editor?.isActive("heading", { level: 3 })}
								onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
							/>
							<div className="mx-1 h-5 w-px bg-[#2a2c34]" />
							<ToolbarButton
								icon={<List className="h-4 w-4" />}
								isActive={editor?.isActive("bulletList")}
								onClick={() => editor?.chain().focus().toggleBulletList().run()}
							/>
							<ToolbarButton
								icon={<ListOrdered className="h-4 w-4" />}
								isActive={editor?.isActive("orderedList")}
								onClick={() => editor?.chain().focus().toggleOrderedList().run()}
							/>
							<ToolbarButton
								icon={<Quote className="h-4 w-4" />}
								isActive={editor?.isActive("blockquote")}
								onClick={() => editor?.chain().focus().toggleBlockquote().run()}
							/>
							<ToolbarButton
								icon={<Minus className="h-4 w-4" />}
								onClick={() => editor?.chain().focus().setHorizontalRule().run()}
							/>
						</div>
						<EditorContent editor={editor} />
					</div>
				)}
			</div>
		</main>
	)
}

function ToolbarButton({
	icon,
	isActive,
	onClick,
}: {
	icon: React.ReactNode
	isActive?: boolean
	onClick?: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-md p-1.5 transition-colors ${
				isActive
					? "bg-[#d0bcff]/20 text-[#d0bcff]"
					: "text-muted-foreground hover:bg-[#2a2a32] hover:text-foreground"
			}`}
		>
			{icon}
		</button>
	)
}
