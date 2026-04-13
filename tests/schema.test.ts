import { describe, it, expect } from "vitest"
import { generateValidRow, generateRowWithout, parseDates } from "./helpers/schema-test-utils"
import { documentSelectSchema } from "@/db/zod-schemas"

describe("document schema", () => {
	it("accepts a complete row", () => {
		const row = generateValidRow(documentSelectSchema)
		expect(documentSelectSchema.safeParse(row).success).toBe(true)
	})

	it("rejects without id", () => {
		const row = generateRowWithout(documentSelectSchema, "id")
		expect(documentSelectSchema.safeParse(row).success).toBe(false)
	})

	it("rejects without title", () => {
		const row = generateRowWithout(documentSelectSchema, "title")
		expect(documentSelectSchema.safeParse(row).success).toBe(false)
	})

	it("round-trips through JSON with parseDates", () => {
		const row = generateValidRow(documentSelectSchema)
		const jsonRoundTripped = parseDates(JSON.parse(JSON.stringify(row)))
		expect(documentSelectSchema.safeParse(jsonRoundTripped).success).toBe(true)
	})
})
