# Changelog

## [2.1.0](https://github.com/jude-bayiha/designome/compare/v2.0.0...v2.1.0) (2026-10-09)


### Features

* **benchmarks:** add a Kotlin and Jetpack Compose benchmark with routed sources ([cfca810](https://github.com/jude-bayiha/designome/commit/cfca810abccb36ff9084a7cf709f2fd53677077e))
* **benchmarks:** add the Kotlin and Jetpack Compose benchmark ([311587b](https://github.com/jude-bayiha/designome/commit/311587b9332f1fb98e05510ecf93edee7197b2f1))
* **benchmarks:** add the override case and guardrail flags ([154d273](https://github.com/jude-bayiha/designome/commit/154d2733de6879739aa6d84aad17f6af63ed411c))
* **benchmarks:** capture routes at 390 px and flag detail guardrails ([9b11591](https://github.com/jude-bayiha/designome/commit/9b1159142c57eef23e48644a80b220c7d160a2ed))
* **benchmarks:** check extracted routing against the expected split ([a648cb4](https://github.com/jude-bayiha/designome/commit/a648cb496a9724cc9f3cf00076e26a7dc3314018))
* **benchmarks:** route Next.js sources from plain-language wishes ([8f8cda0](https://github.com/jude-bayiha/designome/commit/8f8cda09be5496dee37d96ad47a53f03f7b266dc))
* **benchmarks:** route web screenshots from plain-language wishes ([2cd4596](https://github.com/jude-bayiha/designome/commit/2cd45962bd87910440410bc9a991a5f5ed6a341f))
* **benchmarks:** set the Compose brief in a domain unrelated to the sources ([d3aac6f](https://github.com/jude-bayiha/designome/commit/d3aac6f1bf43741e977e9e042440ea54a938e6be))
* **benchmarks:** set the Next.js brief in a domain unrelated to the sources ([29a4bf2](https://github.com/jude-bayiha/designome/commit/29a4bf2e217be9b1b709ad484a46f9a94dc68315))
* **brand:** add the Designome logo ([3b83e3a](https://github.com/jude-bayiha/designome/commit/3b83e3a8694468d1e2e2731fa2647b5f69de7470))
* **brand:** add the Designome logo and listing assets ([4805acd](https://github.com/jude-bayiha/designome/commit/4805acd2227ada9c5807d431f1f3a4954d4e5072))
* quality guardrails, measured budgets and request precedence ([b4ee464](https://github.com/jude-bayiha/designome/commit/b4ee464ceab371fde8c052554ddcaa1a953146c6))
* **runtime:** add detail guardrails and recipes by need to the dossier brief ([229dba8](https://github.com/jude-bayiha/designome/commit/229dba892133655e51747051a733cb2b71780e54))
* **runtime:** open the dossier brief with precedence, guardrails and budgets ([59ec9a9](https://github.com/jude-bayiha/designome/commit/59ec9a9fa9f9e8fdb4a15b1cb67e65e315d289a9))


### Bug Fixes

* **prompts:** measure guardrails and budgets on the screenshots ([c53e4db](https://github.com/jude-bayiha/designome/commit/c53e4db10060f34f2d042b7d8b6ee66898f06f70))
* **prompts:** measure size anchors, slot budgets, skeleton, chart recipes and optical finish ([edadb21](https://github.com/jude-bayiha/designome/commit/edadb217c2bb1c87bb9a5eb235160573bee5d725))
* **prompts:** measure the detail rules that separate polished screens from generic ones ([3191f5b](https://github.com/jude-bayiha/designome/commit/3191f5b7a2c9baf207cd149e9154f0051222bb44))
* **prompts:** require measurable bands for hierarchy and identity ([64a4f0a](https://github.com/jude-bayiha/designome/commit/64a4f0a4c8bc97d3ea4ff061898012211171be08))

## [2.0.0](https://github.com/jude-bayiha/designome/compare/v1.12.0...v2.0.0) (2026-10-08)


### ⚠ BREAKING CHANGES

* **skills:** the designome-extract, designome-install and designome-audit skills are replaced by the designome skill. Invoke /designome or $designome and name the operation. Remove previously installed copies of the three skills. Target projects keep their project-local designome-audit skill.

### Features

* **installer:** export the project audit skill from the unified workflow ([dbca01f](https://github.com/jude-bayiha/designome/commit/dbca01f75119a035eb27192ab5eb1f979fd3a69d))
* **skills:** add the unified designome skill source ([fefdedd](https://github.com/jude-bayiha/designome/commit/fefdeddac8e0c815c6b707f65ca9c4a47642c5d4))
* **skills:** publish one designome skill instead of three ([853c188](https://github.com/jude-bayiha/designome/commit/853c18863b704126efdd47ee4782c66924356181))


### Bug Fixes

* **benchmarks:** pin scaffold package versions ([4fb0c13](https://github.com/jude-bayiha/designome/commit/4fb0c13f75ab0ea8869e3cbf361a0f5aee8c4a34))
* **prompts:** keep source assets and values out of extracted claims ([37120cc](https://github.com/jude-bayiha/designome/commit/37120cccb874bcd85a6e289849d5238551aba363))
* **runtime:** harden identifier trimming and context pointer writes ([3c3aa01](https://github.com/jude-bayiha/designome/commit/3c3aa017f87f7bc998419ea775d7f1a64ed63c5f))

## [1.12.0](https://github.com/jude-bayiha/designome/compare/v1.11.0...v1.12.0) (2026-10-07)


### Features

* cut extraction and generation token cost ([5b324a4](https://github.com/jude-bayiha/designome/commit/5b324a40706f0e2fbdb780d6e5aabf00b78852f3))
* **installer:** export audit skill and guidance for Claude Code ([db1a3fe](https://github.com/jude-bayiha/designome/commit/db1a3feff661b6bc162920bf591115776c7f4de6))
* **installer:** make the dossier README a compact design brief ([5360c2d](https://github.com/jude-bayiha/designome/commit/5360c2dff19322ff1c7eee4e78e4cebf2006f00d))
* **repo:** add Claude Code plugin and marketplace manifests ([7f4f6fc](https://github.com/jude-bayiha/designome/commit/7f4f6fc89bc26f65718aa467c215ac9c80e896e5))
* **runtime:** add matrix-brief and expand-dna commands ([551734d](https://github.com/jude-bayiha/designome/commit/551734db82f8fcd18e4d0de2ff5ca1f1891cd88b))
* support Claude Code alongside Codex ([95d4815](https://github.com/jude-bayiha/designome/commit/95d4815469427d516c20962dc29daa9899e902af))


### Bug Fixes

* **cli:** exit cleanly when stdout is closed early ([4b44afe](https://github.com/jude-bayiha/designome/commit/4b44afe78ba007bafe5a8fa0d97d2f092258c43e))
* **runtime:** keep run directories out of version control ([06799b6](https://github.com/jude-bayiha/designome/commit/06799b6afe7ef39934952253f5a4a8b735e438a8))

## [1.11.0](https://github.com/jude-bayiha/designome/compare/v1.10.0...v1.11.0) (2026-09-17)


### Features

* **audit:** enforce source-bound verification evidence ([441edbb](https://github.com/jude-bayiha/designome/commit/441edbbac0ef3cace7c130c6dba07b5af52db1f0))
* **runtime:** define scoped audit verification contracts ([dda3f75](https://github.com/jude-bayiha/designome/commit/dda3f75d890a86ee42ee209e09ed08cdfa0ae812))


### Bug Fixes

* **installer:** align audit handoffs and generated guidance ([d589427](https://github.com/jude-bayiha/designome/commit/d5894270e4744887823772cf23a8ad038d4e85cc))
* **installer:** distribute self-contained Designome skills ([d7487d3](https://github.com/jude-bayiha/designome/commit/d7487d318ca947ce7e0584e4a15f0ca472dc725e))
* **installer:** ship self-contained skill distributions ([6230938](https://github.com/jude-bayiha/designome/commit/623093875b7298be0b6016903ad57d967fa64264))
* **runtime:** enforce bound audit evidence and fidelity checks ([27813f4](https://github.com/jude-bayiha/designome/commit/27813f4c20db851561843986b3a65efe36dd987f))

## [1.10.0](https://github.com/jude-bayiha/designome/compare/v1.9.0...v1.10.0) (2026-09-09)


### Features

* preserve actionable UI fidelity and benchmark component libraries ([48a29e8](https://github.com/jude-bayiha/designome/commit/48a29e84af554c9df7ff1070fce42c29f44a8281))
* **runtime:** add actionable UI fidelity contracts and benchmarks ([898eb13](https://github.com/jude-bayiha/designome/commit/898eb13525b3d02dce6ceb093dff96ce68d5ed17))

## [1.9.0](https://github.com/jude-bayiha/designome/compare/v1.8.0...v1.9.0) (2026-09-07)


### Features

* **runtime:** add lossless context compilation ([dc48be5](https://github.com/jude-bayiha/designome/commit/dc48be506ae353629c429d4550dfd7aa6744e928))
* **runtime:** add lossless context compiler ([c807b91](https://github.com/jude-bayiha/designome/commit/c807b91b3f08c3c2ca2fc25071d20b434bbcd1f0))

## [1.8.0](https://github.com/jude-bayiha/designome/compare/v1.7.0...v1.8.0) (2026-09-01)


### Features

* introduce deep UI grammar v0.3 ([b2379fe](https://github.com/jude-bayiha/designome/commit/b2379fee2b58aa6fb1300e12fe7ddae580ccb6ae))
* **matrix:** define deep UI grammar v0.3 ([8c856ec](https://github.com/jude-bayiha/designome/commit/8c856eca068c9bdcd65218eb34e804dd3d14a025))
* **runtime:** enforce v0.3 routing contracts ([0a2b36f](https://github.com/jude-bayiha/designome/commit/0a2b36f480f3aa22e029e0a88d058f103e2702e7))

## [1.7.0](https://github.com/jude-bayiha/designome/compare/v1.6.0...v1.7.0) (2026-09-01)


### Features

* normalize conversational skill requests ([0231072](https://github.com/jude-bayiha/designome/commit/02310720d0b3b02c6782fc6a6a462d349b89cd4f))
* **prompts:** normalize conversational skill intent ([2115df0](https://github.com/jude-bayiha/designome/commit/2115df0057dfef694d43e8987af52a91e3d4b519))
* **repo:** add normalized request contracts ([738a585](https://github.com/jude-bayiha/designome/commit/738a585c3b79ae23cdcd4e748f87d66a280b23fc))

## [1.6.0](https://github.com/jude-bayiha/designome/compare/v1.5.0...v1.6.0) (2026-08-31)


### Features

* **audit:** normalize external browser evidence ([3d01093](https://github.com/jude-bayiha/designome/commit/3d010930f65f0f6180a73f5e625984540d577178))
* **installer:** add transactional diagnostics ([c4295ed](https://github.com/jude-bayiha/designome/commit/c4295ed970bb4d230d93b560645789f21f41625b))
* orchestrate resumable Designome workflows ([7c7809c](https://github.com/jude-bayiha/designome/commit/7c7809c6be3a35ecf7a123e3efe3b2dcaa67b3e6))
* **repo:** orchestrate resumable workflows ([7aeb39e](https://github.com/jude-bayiha/designome/commit/7aeb39ec84e132f18b307b4b1cdcc65d54096554))

## [1.5.0](https://github.com/jude-bayiha/designome/compare/v1.4.0...v1.5.0) (2026-08-18)


### Features

* generate the complete design documentation dossier ([92d3879](https://github.com/jude-bayiha/designome/commit/92d3879b0dc3a0e9428885e11e60e51bd162666f))
* **installer:** compile complete design documentation ([f2b5436](https://github.com/jude-bayiha/designome/commit/f2b5436690156a47a100150bb7bb6a129d28e5c3))
* **installer:** record documentation layout ([b74c154](https://github.com/jude-bayiha/designome/commit/b74c154ed8db6eb1d67d92e00000c0ce343a830b))
* **matrix:** define complete documentation projection ([0f23bf4](https://github.com/jude-bayiha/designome/commit/0f23bf4a16a9b4437b9d3e45ae867c358679237f))
* **prompts:** require complete documentation bundle ([eb313a9](https://github.com/jude-bayiha/designome/commit/eb313a92653e854f9cce0df2537d3b0ee41f632e))

## [1.4.0](https://github.com/jude-bayiha/designome/compare/v1.3.0...v1.4.0) (2026-08-18)


### Features

* **product:** add bounded repair and shadcn mapping ([2138429](https://github.com/jude-bayiha/designome/commit/21384295d0d8ffc1b9b225092dba65ebbae33cdd))

## [1.3.0](https://github.com/jude-bayiha/designome/compare/v1.2.0...v1.3.0) (2026-08-18)


### Features

* **audit:** evaluate rendered UI mechanics ([cc3ac81](https://github.com/jude-bayiha/designome/commit/cc3ac81ae531600f2d9003f80d97d27d89dd1a91))
* **audit:** initialize executable evidence plans ([ba00647](https://github.com/jude-bayiha/designome/commit/ba00647378b04ed365e326189919efc0f62e2a58))

## [1.2.0](https://github.com/jude-bayiha/designome/compare/v1.1.0...v1.2.0) (2026-08-18)


### Features

* **installer:** export project audit skill ([a3e541c](https://github.com/jude-bayiha/designome/commit/a3e541c1150ab642191ff4ce262108000d9ebd10))
* **installer:** export project-local audit skill ([1a7ff60](https://github.com/jude-bayiha/designome/commit/1a7ff60faf20a751258c3922c0fcd92aa447cfb1))

## [1.1.0](https://github.com/jude-bayiha/designome/compare/v1.0.1...v1.1.0) (2026-08-18)


### Features

* **installer:** generate target design documentation ([b588fcb](https://github.com/jude-bayiha/designome/commit/b588fcbd6541883e73a0c5f6a97be776d1826b5a))

## [1.0.1](https://github.com/jude-bayiha/designome/compare/v1.0.0...v1.0.1) (2026-08-18)


### Bug Fixes

* **repo:** support WebP screenshot metadata ([659982a](https://github.com/jude-bayiha/designome/commit/659982a5f225f3ed71c33e57bbf21584290dd685))
* **repo:** support WebP screenshot metadata ([ffe9737](https://github.com/jude-bayiha/designome/commit/ffe9737d7a3ac010feee868662248f9c1cf135dc))

## 1.0.0 (2026-08-10)


### Features

* build the Designome v0.2 plugin and runtime ([380abf6](https://github.com/jude-bayiha/designome/commit/380abf63fe9d909e6c17bc2913ed6f04538eadbc))
* **matrix:** define v0.2 design contracts ([fd639fb](https://github.com/jude-bayiha/designome/commit/fd639fbb0d6dcfb4b68b8ee64bdc6106149d11f4))
* **plugin:** add extract install and audit skills ([86307b7](https://github.com/jude-bayiha/designome/commit/86307b72579364ee3594b0eb344efd4d975e0273))
* **prompts:** add modular extraction pipeline ([aa41d66](https://github.com/jude-bayiha/designome/commit/aa41d66606050a2cb54210ca67ce3753bb1f6fb6))
* **runtime:** add deterministic Designome CLI ([318fe12](https://github.com/jude-bayiha/designome/commit/318fe123c2937826d2504fc7e4ba605adf417b3d))

## Changelog

All notable changes to Designome will be proposed and published by Release Please from Conventional Commits.
