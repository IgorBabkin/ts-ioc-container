# 7.0.0 (2026-10-03)

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


# 6.0.0 (2026-10-02)

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


# 5.0.0 (2026-10-02)

  ### 💥 BREAKING CHANGES

    - **ts-ioc-container:**
    add byArgs InjectFn and rename findOrFail to findArgOrFail
    (d3505bfc562264df567e0bdad01bcd2fccb6046c)

  ### ✨ Features

    - **ts-ioc-container:**
    add byArgs InjectFn and rename findOrFail to findArgOrFail
    (d3505bfc562264df567e0bdad01bcd2fccb6046c)


# 4.1.0 (2026-09-27)

  ### ✨ Features

    - **@ibabkin/openapi-to-server:**
    ship AGENTS.md guide for AI coding agents
    (4c9cdcad6dc697c93db6e236bc5441a9ee8bc01b)


# 4.0.0 (2026-09-19)

  ### 💥 BREAKING CHANGES

    - **@ibabkin/openapi-to-server:**
    rename generated UseCase interfaces to HttpRoute
    (2821b79130b3968cfcd793e783811c1b33a6a7c8)

  ### ✨ Features

    - **@ibabkin/openapi-to-server:**
    rename generated UseCase interfaces to HttpRoute
    (2821b79130b3968cfcd793e783811c1b33a6a7c8)


# 3.0.0 (2026-09-17)

  ### 💥 BREAKING CHANGES

    - **@ibabkin/openapi-to-server:**
    replace tag-named controllers with one use case per operationId
    (10b12b9f9453819d1d5aca8dbe46f93e0c239afe)

  ### ✨ Features

    - **@ibabkin/openapi-to-server:**
    replace tag-named controllers with one use case per operationId
    (10b12b9f9453819d1d5aca8dbe46f93e0c239afe)


# 2.0.1 (2026-09-17)

  ### 📝 Other Changes

    - **release:**
    bump published packages for the upgraded release tooling
    (ecaae04be48ee5834ff1d692971e8ef68756a2bf)
    - **config:**
    extract five cross-package specs from existing behaviour
    (64a5c6ebd9eab2d36f2010d2830ac406442c35bc)


# 2.0.0 (2026-09-17)

  ### 💥 BREAKING CHANGES

    - **@ibabkin/openapi-to-server:**
    normalise tags into valid identifiers
    (df65e111cab88687f275c3e70e44c1922c5e5c92)

  ### ✨ Features

    - **@ibabkin/openapi-to-server:**
    normalise tags into valid identifiers
    (df65e111cab88687f275c3e70e44c1922c5e5c92)


# 1.21.1 (2026-09-16)

  ### 🐞 Bug Fixes

    - **@ibabkin/openapi-to-server:**
    trigger dependency release
    (674f4f43146753ddb1497585bdb399ae4460dfd9)


# 1.21.0 (2026-09-16)

  ### ✨ Features

    - **@ibabkin/openapi-to-server:**
    restore CLIs, client generator and createUrl
    (79e3881e59cb85f4919ed3c31270c77ab36b7bcd)


# 1.20.0 (2026-09-16)

  ### ✨ Features

    - **@ibabkin/openapi-to-server:**
    publish under the existing package name
    (8e6973ced01f7d64dfae65da2e204e24d674c9a8)













