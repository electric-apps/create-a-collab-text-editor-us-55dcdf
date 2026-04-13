import { createFileRoute } from "@tanstack/react-router"

const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
	"host",
	"content-encoding",
	"content-length",
])

async function proxyYjs({ request, params }: { request: Request; params: { _splat: string } }) {
	const serviceId = process.env.ELECTRIC_YJS_SERVICE_ID
	const secret = process.env.ELECTRIC_YJS_SECRET
	const electricUrl = process.env.ELECTRIC_URL || "https://api.electric-sql.cloud"

	if (!serviceId || !secret) {
		return new Response("Yjs service not configured", { status: 500 })
	}

	const subPath = params._splat || ""
	const requestUrl = new URL(request.url)
	const targetUrl = `${electricUrl}/v1/yjs/${serviceId}/${subPath}${requestUrl.search}`

	const headers = new Headers(request.headers)
	headers.set("Authorization", `Bearer ${secret}`)
	headers.delete("host")

	const res = await fetch(targetUrl, {
		method: request.method,
		headers,
		body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
		// @ts-expect-error — duplex needed for streaming request bodies
		duplex: "half",
	})

	const forwardedHeaders = new Headers()
	for (const [key, value] of res.headers) {
		if (!HOP_BY_HOP.has(key.toLowerCase())) {
			forwardedHeaders.set(key, value)
		}
	}

	if (!forwardedHeaders.has("cache-control")) {
		forwardedHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate")
	}

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: forwardedHeaders,
	})
}

export const Route = createFileRoute("/api/yjs/$")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			GET: proxyYjs,
			POST: proxyYjs,
			PUT: proxyYjs,
			PATCH: proxyYjs,
			DELETE: proxyYjs,
			OPTIONS: proxyYjs,
		},
	},
})
