# 5.0.0 (2026-10-03)

  ### 💥 BREAKING CHANGES

    - **@ts-ioc-container/bundler:**
    tic build reads a config file or stdin, prints to stdout
    (4a77fd957b3d251b969bc2449fdf375763d9f1e9)
    - **@ts-ioc-container/bundler:**
    output argument, config as --json/--yaml content
    (8aec2ada1bd355796f1bb370cd4e6615ae95a254)
    - **@ts-ioc-container/bundler:**
    drop excludeClasses; classes.glob / exclude take lists
    (0a19dfe30c672bf526e00d296f567f761e54373d)
    - **@ts-ioc-container/bundler:**
    rename class name globs to glob / exclude
    (52c61f3a94759a5e4792b5dd7836ac4437472f26)
    - **@ts-ioc-container/bundler:**
    rename the files config section to glob
    (54afd9f853c9c89044fac19769e2cb3d8dcfc086)
    - **@ts-ioc-container/bundler:**
    explicit configs, no tsconfig extension or zero config
    (454abd9ece738a91c84ce03eb9b910af7444faa0)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    tic build reads a config file or stdin, prints to stdout
    (4a77fd957b3d251b969bc2449fdf375763d9f1e9)
    - **@ts-ioc-container/bundler:**
    output argument, config as --json/--yaml content
    (8aec2ada1bd355796f1bb370cd4e6615ae95a254)
    - **@ts-ioc-container/bundler:**
    drop excludeClasses; classes.glob / exclude take lists
    (0a19dfe30c672bf526e00d296f567f761e54373d)
    - **@ts-ioc-container/bundler:**
    rename class name globs to glob / exclude
    (52c61f3a94759a5e4792b5dd7836ac4437472f26)
    - **@ts-ioc-container/bundler:**
    rename the files config section to glob
    (54afd9f853c9c89044fac19769e2cb3d8dcfc086)
    - **@ts-ioc-container/bundler:**
    explicit configs, no tsconfig extension or zero config
    (454abd9ece738a91c84ce03eb9b910af7444faa0)


# 4.0.0 (2026-10-03)

  ### 💥 BREAKING CHANGES

    - **@ts-ioc-container/bundler:**
    remove the unused tags config field
    (3a18cfc755c1764c721b2630847bc20adf84c4a7)
    - **@ts-ioc-container/bundler:**
    shape bundle configs like a tsconfig
    (1b6911976528d648cca236e6a125e258dbe2e3f1)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    remove the unused tags config field
    (3a18cfc755c1764c721b2630847bc20adf84c4a7)
    - **@ts-ioc-container/bundler:**
    shape bundle configs like a tsconfig
    (1b6911976528d648cca236e6a125e258dbe2e3f1)


# 3.0.0 (2026-10-02)

  ### 💥 BREAKING CHANGES

    - **@ts-ioc-container/bundler:**
    name is the bundle name; class and output follow it
    (3527401018421b86762e269367fe49a2f9f91eb0)
    - **@ts-ioc-container/bundler:**
    zero config from tsconfig.json, @register by default
    (6f0bc9e0737bd733bb07161a2236dc799d1bbcb5)
    - **@ts-ioc-container/bundler:**
    one bundle per *.bundle.json, extending a tsconfig
    (ad9ef945eedab330da6d2154097c1ebb307969c3)
    - **@ts-ioc-container/bundler:**
    rename tsconfig to extends
    (0d77054d8a855a59cc2d78ed2ba0a288b9144e58)
    - **@ts-ioc-container/bundler:**
    rename class name globs to name / excludeName
    (e56cba7c0a380ac0c741dd59922ff51f6ce24503)
    - **@ts-ioc-container/bundler:**
    move paths into the files rule
    (ec0273566c7d62c3d87a42de80d39cbf1ee67ee4)
    - **@ts-ioc-container/bundler:**
    select files before parsing, classes after
    (cf4c3eff889465c3aec40836f156f564168f8293)
    - **@ts-ioc-container/bundler:**
    simplify the bundle config
    (072ade6d1ad2d926677820aad65ce2004d003ee5)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    support YAML configs
    (6d7dd0fe3f43c0fda508812c7af87865401919cd)
    - **@ts-ioc-container/bundler:**
    name is the bundle name; class and output follow it
    (3527401018421b86762e269367fe49a2f9f91eb0)
    - **@ts-ioc-container/bundler:**
    zero config from tsconfig.json, @register by default
    (6f0bc9e0737bd733bb07161a2236dc799d1bbcb5)
    - **@ts-ioc-container/bundler:**
    one bundle per *.bundle.json, extending a tsconfig
    (ad9ef945eedab330da6d2154097c1ebb307969c3)
    - **@ts-ioc-container/bundler:**
    rename tsconfig to extends
    (0d77054d8a855a59cc2d78ed2ba0a288b9144e58)
    - **@ts-ioc-container/bundler:**
    rename class name globs to name / excludeName
    (e56cba7c0a380ac0c741dd59922ff51f6ce24503)
    - **@ts-ioc-container/bundler:**
    move paths into the files rule
    (ec0273566c7d62c3d87a42de80d39cbf1ee67ee4)
    - **@ts-ioc-container/bundler:**
    select files before parsing, classes after
    (cf4c3eff889465c3aec40836f156f564168f8293)
    - **@ts-ioc-container/bundler:**
    simplify the bundle config
    (072ade6d1ad2d926677820aad65ce2004d003ee5)


# 2.0.0 (2026-10-02)

  ### 💥 BREAKING CHANGES

    - **ts-ioc-container:**
    add byArgs InjectFn and rename findOrFail to findArgOrFail
    (d3505bfc562264df567e0bdad01bcd2fccb6046c)

  ### ✨ Features

    - **ts-ioc-container:**
    add byArgs InjectFn and rename findOrFail to findArgOrFail
    (d3505bfc562264df567e0bdad01bcd2fccb6046c)


# 1.5.0 (2026-09-27)

  ### ✨ Features

    - **@ibabkin/openapi-to-zod:**
    ship AGENTS.md guide for AI coding agents
    (c98dfc63b2a451223be6dafc3fda9355b3d70c04)


# 1.4.4 (2026-09-26)

  ### 🐞 Bug Fixes

    - **@ibabkin/openapi-to-zod:**
    coerce boolean and array query parameters
    (18c213158e7246ba8d789e9853a2f64f192710fe)


# 1.4.3 (2026-09-17)

  ### 🐞 Bug Fixes

    - **@ibabkin/openapi-to-zod:**
    declare schemas in dependency order and defer cyclic references
    (8547a11f078d772148923d5236b451786e7a49f3)


# 1.4.2 (2026-09-17)

  ### 📝 Other Changes

    - **release:**
    bump published packages for the upgraded release tooling
    (ecaae04be48ee5834ff1d692971e8ef68756a2bf)
    - **config:**
    extract five cross-package specs from existing behaviour
    (64a5c6ebd9eab2d36f2010d2830ac406442c35bc)
    - **config:**
    add specs directory for spec-driven development
    (0fa3455264a20cfe5ccd5fa9c6b8873a72d13bb9)


# 1.4.1 (2026-09-16)

  ### 🐞 Bug Fixes

    - **@ibabkin/openapi-to-zod:**
    trigger dependency release
    (9812445711ef59298fc7fac7bc3d1ff4cfaec61f)


# 1.4.0 (2026-09-16)

  ### ✨ Features

    - **@ibabkin/openapi-to-zod:**
    cover combinators, constraints, formats and nullable
    (115aa3cd51bba7a3d90222d307295a2cf94982e3)
    - **@ibabkin/openapi-to-zod:**
    restore the openapi-to-zod CLI
    (1489799558a70aa90e1175f7a9ba8ae710575735)


# 1.3.0 (2026-09-16)

  ### ✨ Features

    - **@ibabkin/openapi-to-zod:**
    publish under the existing package name
    (8d522ae590718b67abc91308ece3976364013638)













