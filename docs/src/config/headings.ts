/**
 * Page headings configuration for table of contents
 */

import type { Heading } from "./types";

export const pageHeadings: Record<string, Heading[]> = {
  "/": [
    { id: "advantages", text: "Advantages", level: 2 },
    { id: "quick-start", text: "Quick Start", level: 2 },
    { id: "documentation", text: "Documentation", level: 2 },
    { id: "core-architecture", text: "Core Architecture", level: 2 },
    { id: "class-diagram", text: "Class Diagram", level: 2 },
  ],
  "/ts-ioc-container": [
    { id: "advantages", text: "Advantages", level: 2 },
    { id: "quick-start", text: "Quick Start", level: 2 },
    { id: "documentation", text: "Documentation", level: 2 },
    { id: "core-architecture", text: "Core Architecture", level: 2 },
    { id: "class-diagram", text: "Class Diagram", level: 2 },
  ],
  "/ts-ioc-container/": [
    { id: "advantages", text: "Advantages", level: 2 },
    { id: "quick-start", text: "Quick Start", level: 2 },
    { id: "documentation", text: "Documentation", level: 2 },
    { id: "core-architecture", text: "Core Architecture", level: 2 },
    { id: "class-diagram", text: "Class Diagram", level: 2 },
  ],
  "/ts-ioc-container/container": [
    { id: "scopes", text: "Scopes", level: 2 },
    {
      id: "cross-scope-dependency-injection",
      text: "Cross-Scope Dependency Injection",
      level: 2,
    },
    {
      id: "dependency-resolution-flow",
      text: "Dependency Resolution Flow",
      level: 2,
    },
    { id: "instance-management", text: "Instance Management", level: 2 },
    { id: "disposal", text: "Disposal", level: 2 },
    { id: "lazy-loading", text: "Lazy Loading", level: 2 },
    { id: "memory-management", text: "Memory Management", level: 2 },
    { id: "container-modules", text: "Container Modules", level: 2 },
    { id: "key-design-decisions", text: "Key Design Decisions", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "api-reference", text: "API Reference", level: 2 },
  ],
  "/ts-ioc-container/registration": [
    { id: "registration-flow", text: "Registration Flow", level: 2 },
    { id: "registration-methods", text: "Registration Methods", level: 2 },
    {
      id: "decorator-based-registration",
      text: "Decorator-Based Registration",
      level: 2,
    },
    {
      id: "fluent-api-registration",
      text: "Fluent API Registration",
      level: 2,
    },
    { id: "keys", text: "Keys", level: 2 },
    { id: "scope-registration", text: "Scope Registration", level: 2 },
    { id: "registration-pipeline", text: "Registration Pipeline", level: 2 },
    { id: "container-modules", text: "Container Modules", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "registration-lifecycle", text: "Registration Lifecycle", level: 2 },
  ],
  "/ts-ioc-container/provider": [
    { id: "factory-pattern", text: "Factory Pattern", level: 2 },
    { id: "provider-types", text: "Provider Types", level: 2 },
    { id: "singleton", text: "Singleton", level: 2 },
    { id: "arguments", text: "Arguments", level: 2 },
    { id: "visibility", text: "Visibility", level: 2 },
    { id: "alias", text: "Alias", level: 2 },
    { id: "decorator", text: "Decorator", level: 2 },
    { id: "lazy-loading", text: "Lazy Loading", level: 2 },
    { id: "provider-pipeline", text: "Provider Pipeline", level: 2 },
    {
      id: "performance-considerations",
      text: "Performance Considerations",
      level: 2,
    },
    { id: "custom-providers", text: "Custom Providers", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
  ],
  "/ts-ioc-container/injector": [
    { id: "injection-strategies", text: "Injection Strategies", level: 2 },
    { id: "available-injectors", text: "Available Injectors", level: 2 },
    { id: "metadata-injector", text: "Metadata Injector", level: 2 },
    { id: "simple-injector", text: "Simple Injector", level: 2 },
    { id: "proxy-injector", text: "Proxy Injector", level: 2 },
    {
      id: "choosing-the-right-injector",
      text: "Choosing the Right Injector",
      level: 2,
    },
    { id: "strategy-pattern", text: "Strategy Pattern", level: 2 },
    { id: "custom-injectors", text: "Custom Injectors", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
  ],
  "/ts-ioc-container/hooks": [
    { id: "what-are-hooks", text: "What are Hooks?", level: 2 },
    { id: "onconstruct", text: "OnConstruct Hooks", level: 2 },
    { id: "ondispose", text: "OnDispose Hooks", level: 2 },
    { id: "property-injection", text: "Property Injection", level: 2 },
    { id: "custom-hooks", text: "Custom Hooks", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
  ],
  "/ts-ioc-container/token": [
    { id: "why-tokens", text: "Why Tokens?", level: 2 },
    { id: "token-hierarchy", text: "Token Hierarchy", level: 2 },
    { id: "select-utility", text: "The `select` Utility", level: 2 },
    { id: "single-token", text: "SingleToken", level: 2 },
    { id: "group-alias-token", text: "GroupAliasToken", level: 2 },
    { id: "single-alias-token", text: "SingleAliasToken", level: 2 },
    { id: "argument-binding", text: "Argument Binding", level: 2 },
    { id: "lazy-loading", text: "Lazy Loading", level: 2 },
    { id: "dynamic-arguments", text: "Dynamic Arguments", level: 2 },
    { id: "additional-token-types", text: "Additional Token Types", level: 2 },
  ],
  "/ts-ioc-container/metadata": [
    { id: "what-is-metadata", text: "What is Metadata?", level: 2 },
    { id: "prerequisites", text: "Prerequisites", level: 2 },
    { id: "api-overview", text: "API Overview", level: 2 },
    { id: "class-metadata", text: "Class Metadata", level: 2 },
    { id: "parameter-metadata", text: "Parameter Metadata", level: 2 },
    { id: "method-metadata", text: "Method Metadata", level: 2 },
    { id: "how-it-works", text: "How It Works", level: 2 },
    { id: "usage-in-container", text: "Usage in ts-ioc-container", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "limitations", text: "Limitations", level: 2 },
    { id: "alternative-approaches", text: "Alternative Approaches", level: 2 },
  ],
  "/ts-ioc-container/react": [
    { id: "overview", text: "Overview", level: 2 },
    { id: "setup", text: "Setup", level: 2 },
    { id: "container-setup", text: "Container Setup", level: 2 },
    { id: "app-integration", text: "App Integration", level: 2 },
    { id: "page-scope", text: "Page Scope", level: 2 },
    { id: "widget-scope", text: "Widget Scope", level: 2 },
    { id: "using-tokens", text: "Using Tokens", level: 2 },
    { id: "complete-example", text: "Complete Example", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "api-reference", text: "API Reference", level: 2 },
  ],
  "/ts-ioc-container/solidjs": [
    { id: "overview", text: "Overview", level: 2 },
    { id: "setup", text: "Setup", level: 2 },
    { id: "container-setup", text: "Container Setup", level: 2 },
    { id: "app-integration", text: "App Integration", level: 2 },
    { id: "page-scope", text: "Page Scope", level: 2 },
    { id: "widget-scope", text: "Widget Scope", level: 2 },
    {
      id: "reactive-services",
      text: "Reactive Services with Signals",
      level: 2,
    },
    { id: "resources", text: "Using with Resources", level: 2 },
    { id: "complete-example", text: "Complete Example", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "api-reference", text: "API Reference", level: 2 },
  ],
  "/ts-ioc-container/nextjs": [
    { id: "overview", text: "Overview", level: 2 },
    { id: "server-setup", text: "Server-Side Setup", level: 2 },
    { id: "api-routes", text: "API Routes (App Router)", level: 2 },
    { id: "server-actions", text: "Server Actions", level: 2 },
    { id: "server-components", text: "Server Components", level: 2 },
    { id: "client-setup", text: "Client-Side Setup", level: 2 },
    {
      id: "client-container",
      text: "Client Container Configuration",
      level: 2,
    },
    { id: "providers", text: "Provider Components", level: 2 },
    { id: "client-components", text: "Client Components", level: 2 },
    { id: "pages-router", text: "Pages Router Integration", level: 2 },
    { id: "api-routes-pages", text: "API Routes (Pages Router)", level: 2 },
    { id: "complete-example", text: "Complete Example", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "api-reference", text: "API Reference", level: 2 },
  ],
  "/ts-ioc-container/expressjs": [
    { id: "overview", text: "Overview", level: 2 },
    { id: "setup", text: "Basic Setup", level: 2 },
    { id: "middleware", text: "Container Middleware", level: 2 },
    { id: "app-setup", text: "Application Setup", level: 2 },
    { id: "routes", text: "Using in Routes", level: 2 },
    { id: "services", text: "Service Definitions", level: 2 },
    { id: "transaction-scope", text: "Transaction Scope", level: 2 },
    { id: "helper-functions", text: "Helper Functions", level: 2 },
    { id: "testing", text: "Testing", level: 2 },
    { id: "complete-example", text: "Complete Example", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "api-reference", text: "API Reference", level: 2 },
  ],
  "/ts-ioc-container/fastify": [
    { id: "overview", text: "Overview", level: 2 },
    { id: "setup", text: "Basic Setup", level: 2 },
    { id: "plugin", text: "Container Plugin", level: 2 },
    { id: "app-setup", text: "Application Setup", level: 2 },
    { id: "routes", text: "Using in Routes", level: 2 },
    { id: "services", text: "Service Definitions", level: 2 },
    { id: "transaction-scope", text: "Transaction Scope", level: 2 },
    { id: "schemas", text: "JSON Schema Validation", level: 2 },
    { id: "testing", text: "Testing", level: 2 },
    { id: "complete-example", text: "Complete Example", level: 2 },
    { id: "best-practices", text: "Best Practices", level: 2 },
    { id: "api-reference", text: "API Reference", level: 2 },
  ],
};

/**
 * Get headings for a specific page path
 * @param pathname - The current page pathname
 * @returns Array of headings or empty array if not found
 */
export function getHeadingsForPath(pathname: string): Heading[] {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const headings =
    pageHeadings[normalized] || pageHeadings[`${normalized}/`] || [];

  // Debug logging for development
  if (headings.length === 0 && import.meta.env.DEV) {
    console.log(
      `[TOC Debug] No headings found for: "${pathname}" (normalized: "${normalized}")`,
    );
    console.log("[TOC Debug] Available paths:", Object.keys(pageHeadings));
  }

  return headings;
}
