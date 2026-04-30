/**
 * Navigation configuration for the documentation site
 */

import type { NavigationItem } from "./types";
import { isNavigationGroup } from "./types";

export { isNavigationGroup };

export const navigation: NavigationItem[] = [
  { title: "Overview", href: "/ts-ioc-container/" },
  { title: "Benchmarks", href: "/ts-ioc-container/benchmarks" },
  { title: "Dependency & Scope", href: "/ts-ioc-container/container" },
  { title: "Dependency Registration", href: "/ts-ioc-container/registration" },
  { title: "Provider Behavior", href: "/ts-ioc-container/provider" },
  { title: "Pipes", href: "/ts-ioc-container/pipes" },
  { title: "Token-Based Injection", href: "/ts-ioc-container/token" },
  { title: "Injector Strategies", href: "/ts-ioc-container/injector" },
  { title: "Lifecycle Hooks", href: "/ts-ioc-container/hooks" },
  { title: "Metadata Utilities", href: "/ts-ioc-container/metadata" },
  {
    title: "Errors & Boundaries",
    href: "/ts-ioc-container/errors-and-boundaries",
  },
  {
    title: "Alternatives",
    children: [
      { title: "tsyringe", href: "/ts-ioc-container/tsyringe-alternative" },
      {
        title: "Inversify / Awilix",
        href: "/ts-ioc-container/inversify-awilix-alternative",
      },
    ],
  },
  {
    title: "Adapters",
    children: [
      { title: "React", href: "/ts-ioc-container/react" },
      { title: "SolidJS", href: "/ts-ioc-container/solidjs" },
      { title: "Next.js", href: "/ts-ioc-container/nextjs" },
      { title: "Express.js", href: "/ts-ioc-container/expressjs" },
      { title: "Fastify", href: "/ts-ioc-container/fastify" },
    ],
  },
];
