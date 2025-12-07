/**
 * Site metadata and badge configuration
 */

import type { BadgeConfig, SiteMetadata } from "./types";

export const siteMetadata: SiteMetadata = {
  title: "ts-ioc-container",
  description: "TypeScript IoC (Inversion Of Control) container library",
  author: "IgorBabkin",
  license: {
    name: "ISC",
    url: "https://github.com/IgorBabkin/ts-ioc-container/tree/main/LICENSE",
  },
  repository: {
    github: "https://github.com/IgorBabkin/ts-ioc-container",
    npm: "https://www.npmjs.com/package/ts-ioc-container",
  },
};

export const badges: BadgeConfig[] = [
  {
    src: "https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square",
    alt: "NPM version",
    style: "height: 20px;",
  },
  {
    src: "https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square",
    alt: "npm downloads",
    style: "height: 20px;",
  },
  {
    src: "https://img.shields.io/bundlejs/size/ts-ioc-container",
    alt: "npm package size",
    style: "height: 20px;",
  },
  {
    src: "https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master",
    alt: "Coverage Status",
    href: "https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master",
    style: "height: 20px;",
  },
  {
    src: "https://img.shields.io/npm/l/ts-ioc-container",
    alt: "License",
    href: "https://github.com/IgorBabkin/ts-ioc-container/tree/main/LICENSE",
    style: "height: 20px;",
  },
  {
    src: "https://img.shields.io/badge/semantic--release-e10079.svg",
    alt: "semantic-release",
    href: "https://github.com/semantic-release/semantic-release",
    style: "height: 20px;",
  },
];
