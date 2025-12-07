/**
 * Shared type definitions for the documentation site
 */

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3 | 4;
}

export interface NavigationItem {
  title: string;
  href: string;
}

export interface BadgeConfig {
  src: string;
  alt: string;
  href?: string;
  style?: string;
}

export interface SiteMetadata {
  title: string;
  description: string;
  author: string;
  license: {
    name: string;
    url: string;
  };
  repository: {
    github: string;
    npm: string;
  };
}

export type ThemeMode = "light" | "dark";

export const THEME_KEY = "theme" as const;
export const THEME_DARK = "dark" as const;
export const THEME_LIGHT = "light" as const;
