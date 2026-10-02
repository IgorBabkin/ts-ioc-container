# 2.1.0 (2026-10-02)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    build the tic CLI on ts-ioc-container
    (341496294c68b82eee30213d581e0692df8038ef)


# 2.0.0 (2026-10-02)

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

  ### 📦 Dependencies

    - 📦 update
    ts-ioc-container
    to
    74.0.0


# 1.5.0 (2026-10-02)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    support bundle config tags
    (fe595213d65201506047949c9136aaf4f57d0f07)


# 1.4.0 (2026-10-02)

  ### 📦 Dependencies

    - 📦 update
    ts-ioc-container
    to
    73.1.0


# 1.3.0 (2026-10-02)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    scope-aware token warnings and alias excludes
    (2bb9a8394683f3161778fa4a6ed20feae74a24c4)


# 1.2.0 (2026-10-02)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    exclude classes by name in select
    (eb57f8e3a6575858a6b8e758b7d3834be56c1b4c)


# 1.1.0 (2026-10-02)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    add additionalExclude and warn when exclude drops defaults
    (b4f43d7cd2d2b54be370538176958c1e81853b73)


# 1.0.0 (2026-10-02)

  ### 💥 BREAKING CHANGES

    - **ts-ioc-container:**
    add byArgs InjectFn and rename findOrFail to findArgOrFail
    (d3505bfc562264df567e0bdad01bcd2fccb6046c)

  ### ✨ Features

    - **ts-ioc-container:**
    add byArgs InjectFn and rename findOrFail to findArgOrFail
    (d3505bfc562264df567e0bdad01bcd2fccb6046c)

  ### 📦 Dependencies

    - 📦 update
    ts-ioc-container
    to
    73.0.0


# 0.2.0 (2026-09-27)

  ### 📝 Other Changes

    - **@ts-ioc-container/bundler:**
    link ts-ioc-container by npm URL so it works on npm
    (c7e219b0f7aac5be8a5684ddf5b3096cd75c581a)

  ### 📦 Dependencies

    - 📦 update
    ts-ioc-container
    to
    72.3.2


# 0.1.0 (2026-09-27)

  ### ✨ Features

    - **@ts-ioc-container/bundler:**
    filter classes right after parsing with an ExportPredicate
    (2056a2067132efd47b074c73e6d85814030a86d7)
    - **@ts-ioc-container/bundler:**
    rename the package from @ts-ioc-container/compiler
    (668170edadd15384cf1661be3efe198e6aabf51e)
    - **ts-ioc-container:**
    let tokens declare variantOf / primaryVariantOf / fallbackOf
    (8dfcb5fdf2d85a7340c79b2435cdeafa549cf59f)
    - **ts-ioc-container:**
    make the fallback a required feature token constructor argument
    (7b2c4a5d2caeea7a0d968e142cdcdd7b7400e6e3)
    - **ts-ioc-container:**
    add multi-variant and toggle feature tokens with mandatory fallback
    (918c68733eb0381c850b6169e56695fa718766ce)

  ### 🐞 Bug Fixes

    - **@ts-ioc-container/bundler:**
    ship only build output, not lib sources
    (0bc72bf6815f7694b6dfcccffbf8834f2e2e430b)

  ### 📝 Other Changes

    - **ts-ioc-container:**
    add environment-based registration recipe
    (5c110f5e1e1a2c7f0ed467ce73b2e71706611e6b)












