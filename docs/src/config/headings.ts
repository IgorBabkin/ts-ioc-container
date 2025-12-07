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
    { id: "single-token", text: "SingleToken", level: 2 },
    { id: "group-alias-token", text: "GroupAliasToken", level: 2 },
    { id: "single-alias-token", text: "SingleAliasToken", level: 2 },
    { id: "argument-binding", text: "Argument Binding", level: 2 },
    { id: "lazy-loading", text: "Lazy Loading", level: 2 },
    { id: "dynamic-arguments", text: "Dynamic Arguments", level: 2 },
  ],
};

/**
 * Get headings for a specific page path
 * @param pathname - The current page pathname
 * @returns Array of headings or empty array if not found
 */
export function getHeadingsForPath(pathname: string): Heading[] {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return pageHeadings[normalized] || pageHeadings[`${normalized}/`] || [];
}
