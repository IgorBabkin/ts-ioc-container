#!/usr/bin/env node
// Committed entry point so pnpm can link the bin before `esm/` is built.
import '../esm/bin/openapi-to-client.js';
