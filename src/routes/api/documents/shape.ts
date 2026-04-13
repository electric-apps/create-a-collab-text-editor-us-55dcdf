import { createFileRoute } from "@tanstack/react-router"
import { proxyElectricRequest } from "@/lib/electric-proxy"

export const Route = createFileRoute("/api/documents/shape")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) => proxyElectricRequest(request, "documents"),
		},
	},
})
