#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createOiwServer } from "./server.js";

// stdout carries JSON-RPC only; diagnostics go to stderr.
const server = createOiwServer();
await server.connect(new StdioServerTransport());
console.error("oiw-mcp: ready on stdio");
