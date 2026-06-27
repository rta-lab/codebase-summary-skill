#!/usr/bin/env node

/**
 * Validates summary.json against summary-schema.json.
 * Usage: node validate-summary.cjs <path-to-summary.json>
 *
 * The validation rules live in summary-schema.json — the single source of truth.
 * This script reads that schema at runtime and interprets the subset of JSON
 * Schema it uses: type, properties, required, additionalProperties:false,
 * enum, items, and minItems.
 *
 * Zero dependencies. Exits 0 on success, 1 on validation failure.
 */

const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) {
	console.error("Usage: node validate-summary.cjs <path-to-summary.json>");
	process.exit(1);
}

const schemaPath = path.join(__dirname, "summary-schema.json");
let rootSchema;
try {
	const doc = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
	rootSchema = doc.output_schema;
	if (!rootSchema) throw new Error('summary-schema.json is missing top-level "output_schema"');
} catch (e) {
	console.error(`Failed to load schema from ${schemaPath}:`, e.message);
	process.exit(1);
}

let summary;
try {
	summary = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
	console.error("Failed to parse JSON:", e.message);
	process.exit(1);
}

// --- Generic JSON Schema interpreter ---

function typeOf(v) {
	if (Array.isArray(v)) return "array";
	if (v === null) return "null";
	return typeof v;
}

function validate(value, schema, p, errors) {
	if (schema.enum && !schema.enum.includes(value)) {
		const allowed = schema.enum.map((v) => JSON.stringify(v)).join(", ");
		errors.push(`${p}: invalid value ${JSON.stringify(value)} (expected one of ${allowed})`);
	}

	switch (schema.type) {
		case "object": {
			if (typeOf(value) !== "object") {
				errors.push(`${p}: expected object, got ${typeOf(value)}`);
				return;
			}
			for (const req of schema.required || []) {
				if (!(req in value)) errors.push(`${p}: missing required field "${req}"`);
			}
			for (const key of Object.keys(value)) {
				if (schema.properties && key in schema.properties) {
					validate(value[key], schema.properties[key], `${p}.${key}`, errors);
				} else if (schema.additionalProperties === false) {
					errors.push(`${p}: unexpected field "${key}"`);
				}
			}
			break;
		}
		case "array": {
			if (typeOf(value) !== "array") {
				errors.push(`${p}: expected array, got ${typeOf(value)}`);
				return;
			}
			if (typeof schema.minItems === "number" && value.length < schema.minItems) {
				errors.push(`${p}: must have at least ${schema.minItems} item(s), got ${value.length}`);
			}
			if (schema.items) {
				value.forEach((el, i) => validate(el, schema.items, `${p}[${i}]`, errors));
			}
			break;
		}
		case "integer": {
			if (typeOf(value) !== "number" || !Number.isInteger(value)) {
				errors.push(`${p}: expected integer, got ${typeOf(value)}`);
			}
			break;
		}
		case "string": {
			if (typeOf(value) !== "string") {
				errors.push(`${p}: expected string, got ${typeOf(value)}`);
			}
			break;
		}
		default:
			break;
	}
}

// --- Semantic validations beyond schema structure ---

function semanticChecks(summary, errors) {
	// Check: architecture_diagram_mermaid should contain a mermaid diagram keyword
	if (summary.architecture_diagram_mermaid) {
		const diagram = summary.architecture_diagram_mermaid.trim();
		const validStarts = [
			"graph ", "graph\n",
			"flowchart ", "flowchart\n",
			"sequenceDiagram", "classDiagram", "stateDiagram",
			"erDiagram", "gantt", "pie", "gitGraph",
			"C4Context", "C4Container", "C4Component", "C4Deployment",
			"mindmap", "timeline", "block-beta",
		];
		const hasValidStart = validStarts.some((s) => diagram.startsWith(s));
		if (!hasValidStart) {
			errors.push(
				`root.architecture_diagram_mermaid: does not appear to start with a valid Mermaid diagram type`
			);
		}
	}

	// Check: api_endpoints with category "http" should have a real HTTP method
	if (Array.isArray(summary.api_endpoints)) {
		const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
		summary.api_endpoints.forEach((ep, i) => {
			if (ep.category === "http" && ep.method) {
				if (!httpMethods.includes(ep.method.toUpperCase())) {
					errors.push(
						`root.api_endpoints[${i}].method: HTTP endpoint should use a standard HTTP method, got "${ep.method}"`
					);
				}
			}
		});
	}

	// Check: modules should have unique names
	if (Array.isArray(summary.modules)) {
		const names = summary.modules.map((m) => m.name);
		const dupes = names.filter((n, i) => names.indexOf(n) !== i);
		if (dupes.length > 0) {
			errors.push(`root.modules: duplicate module names found: ${[...new Set(dupes)].join(", ")}`);
		}
	}

	// Check: tech_stack should have at least one "language" layer
	if (Array.isArray(summary.tech_stack)) {
		const hasLanguage = summary.tech_stack.some((t) => t.layer === "language");
		if (!hasLanguage) {
			errors.push(`root.tech_stack: should include at least one entry with layer "language"`);
		}
	}
}

// --- Run ---

const errors = [];

console.log("Validating summary.json against schema...\n");

// Schema validation
validate(summary, rootSchema, "root", errors);

// Semantic validation
if (errors.length === 0) {
	semanticChecks(summary, errors);
}

// Report
if (errors.length === 0) {
	const stats = {
		tech_stack: (summary.tech_stack || []).length,
		modules: (summary.modules || []).length,
		api_endpoints: (summary.api_endpoints || []).length,
		env_vars: (summary.configuration && summary.configuration.env_vars || []).length,
		observations: (summary.observations || []).length,
	};

	console.log("PASS: summary.json is valid\n");
	console.log("Summary statistics:");
	console.log(`  Tech stack entries:  ${stats.tech_stack}`);
	console.log(`  Modules:             ${stats.modules}`);
	console.log(`  API endpoints:       ${stats.api_endpoints}`);
	console.log(`  Environment vars:    ${stats.env_vars}`);
	console.log(`  Observations:        ${stats.observations}`);
} else {
	for (const msg of errors) console.error("  ERROR:", msg);
	console.error(`\nFAIL: ${errors.length} error(s)`);
	process.exit(1);
}
