# Changelog

## [1.5.2](https://github.com/dcotelo/ChartImpact/compare/v1.5.1...v1.5.2) (2026-01-02)


### Bug Fixes

* enhance health check and analytics support in frontend and backend ([#89](https://github.com/dcotelo/ChartImpact/issues/89)) ([414c3bf](https://github.com/dcotelo/ChartImpact/commit/414c3bfad26a24b2aa5a3103870aaf46ed0d19de))

## [1.5.1](https://github.com/dcotelo/ChartImpact/compare/v1.5.0...v1.5.1) (2026-01-02)


### Bug Fixes

* upgrade react-syntax-highlighter from 16.0.0 to 16.1.0 ([#85](https://github.com/dcotelo/ChartImpact/issues/85)) ([a310360](https://github.com/dcotelo/ChartImpact/commit/a310360603a81c94bf79335dfc6e603abbe6900e))

## [1.5.0](https://github.com/dcotelo/ChartImpact/compare/v1.4.0...v1.5.0) (2025-12-29)


### Features

* Add stored analysis page and analytics dashboard ([#83](https://github.com/dcotelo/ChartImpact/issues/83)) ([31d3248](https://github.com/dcotelo/ChartImpact/commit/31d32482e570246e38d3cbf447eadfe44d8f41db))

## [1.4.0](https://github.com/dcotelo/ChartImpact/compare/v1.3.0...v1.4.0) (2025-12-29)


### Features

* enhance analysis results page ([#81](https://github.com/dcotelo/ChartImpact/issues/81)) ([790da72](https://github.com/dcotelo/ChartImpact/commit/790da72500a4122394ab2d10116423ed9cb35a30))

## [1.3.0](https://github.com/dcotelo/ChartImpact/compare/v1.2.1...v1.3.0) (2025-12-29)


### Features

* implement new analysis results page with comparison functionality ([#79](https://github.com/dcotelo/ChartImpact/issues/79)) ([6019f2a](https://github.com/dcotelo/ChartImpact/commit/6019f2a398e0c434c8edd2062d024a25703b1114))

## [1.2.1](https://github.com/dcotelo/ChartImpact/compare/v1.2.0...v1.2.1) (2025-12-28)


### Bug Fixes

* update upload and download artifact actions to version 4 ([#67](https://github.com/dcotelo/ChartImpact/issues/67)) ([8550f4b](https://github.com/dcotelo/ChartImpact/commit/8550f4bc00c49774914d29f670fc222084f5b687))

## [1.2.0](https://github.com/dcotelo/ChartImpact/compare/v1.1.0...v1.2.0) (2025-12-28)


### Features

* add ChartInspect image to README files for better visualization ([698aeed](https://github.com/dcotelo/ChartImpact/commit/698aeed76d03f2474902cff075224a9822383133))
* Add checkbox to ignore label changes in diff output ([ef46e67](https://github.com/dcotelo/ChartImpact/commit/ef46e674ef60f723182dc7213905ed86e6dcc29a))
* Add collapsible resource groups and green/red diff coloring ([fb58f5e](https://github.com/dcotelo/ChartImpact/commit/fb58f5e7ebc01f03277784818d9bc07ce9f3ce68))
* Add detailed progress tracking, color-coded diff display, and demo values ([bdded6c](https://github.com/dcotelo/ChartImpact/commit/bdded6c8cd3725174bde68286107c95c95bc7153))
* Add executive summary before categorized diff display ([44b10e1](https://github.com/dcotelo/ChartImpact/commit/44b10e11699cc26f30f6eea72dc29c1a2cc2fdf4))
* Add GitHub Actions workflows for CI/CD ([1248328](https://github.com/dcotelo/ChartImpact/commit/1248328a0516740b8c2e1c19a9c8805b9c017a71))
* Add individual resource collapse/expand within each resource type ([ba1cd59](https://github.com/dcotelo/ChartImpact/commit/ba1cd59805450824ba60ca07ec4807788441a464))
* Add progress indicators and enhance error display ([6c41de4](https://github.com/dcotelo/ChartImpact/commit/6c41de4b80338183562eb49bb04bab91cfd59a60))
* Add progress indicators, improve error handling, and update to ArgoCD examples ([b4c051f](https://github.com/dcotelo/ChartImpact/commit/b4c051f8a37f392995d6fd2bd3d953ab97a4518c))
* Enhance Helm and dyff installation in Dockerfile ([7f05454](https://github.com/dcotelo/ChartImpact/commit/7f054547dcdd7232dd6f241952c959947cb0b529))
* initialize frontend with Next.js and TypeScript setup ([061bbc4](https://github.com/dcotelo/ChartImpact/commit/061bbc4d3cb46df2c1fbbd8ac537d0111593cc02))
* Parse dyff-style diff output with resource paths and identifiers ([0fa4547](https://github.com/dcotelo/ChartImpact/commit/0fa45472db997395a054b7ca924e20f41533190b))
* Revamp diff grouping with intelligent categories ([2a034fb](https://github.com/dcotelo/ChartImpact/commit/2a034fbbbfef8265e673aef3bcf38811a40e63b0))
* update ChartInspect logo image ([d958c48](https://github.com/dcotelo/ChartImpact/commit/d958c48cabaf4520c1a226b5799820043709f1e4))
* update CI workflow to use actions/upload-artifact@v4 and refactor API call in compare route ([921f329](https://github.com/dcotelo/ChartImpact/commit/921f329a0d7a3ee4a3b505754936149e63a8fff7))
* Update demo examples to use ArgoCD Helm charts ([fabdab3](https://github.com/dcotelo/ChartImpact/commit/fabdab3c1467bc826cc62aea44975b0c3c49c899))
* Update DiffDisplay and CompareForm components for improved UI and functionality ([4ef0483](https://github.com/dcotelo/ChartImpact/commit/4ef0483c848d685673118450e29edc8e6c822a76))


### Bug Fixes

* Add Helm dependency building before template rendering ([5e13087](https://github.com/dcotelo/ChartImpact/commit/5e13087e04225f8c1fea0b9934d37c54d8a5c410))
* Complete individual resource collapse functionality ([5280450](https://github.com/dcotelo/ChartImpact/commit/5280450e55731dbd68d2a76b0242f76c0a54e31e))
* Correct useEffect dependencies for expand state ([cdd7c0c](https://github.com/dcotelo/ChartImpact/commit/cdd7c0c9c4a2b6ba74023fcdff01b8737cf3683b))
* frontend/package.json & frontend/package-lock.json to reduce vulnerabilities ([99c2ac7](https://github.com/dcotelo/ChartImpact/commit/99c2ac703b111f1bef8fe3ac14659955c0214820))
* Improve Helm dependency building with better error handling ([057e4ff](https://github.com/dcotelo/ChartImpact/commit/057e4ff2aeefde7e88a3401a2acb1b1804f3a7ac))
* Improve label filtering logic for dyff format ([058bcd9](https://github.com/dcotelo/ChartImpact/commit/058bcd9d7021ca5b5c4d73c31c453dc4e0887b1b))
* Improve useEffect dependency to properly expand groups on new comparison ([b06275f](https://github.com/dcotelo/ChartImpact/commit/b06275fd903e14bd1086dbde98359ee6abfe4f13))
* Initialize expanded state properly in DiffDisplay ([5a564b5](https://github.com/dcotelo/ChartImpact/commit/5a564b559ec4ff7e0d673772a75b73676117ae39))
* Preserve first character of diff lines that don't have + or - markers ([dfc3f92](https://github.com/dcotelo/ChartImpact/commit/dfc3f927091b7da0a71286e0685c0523d0bf7670))
* Release process ([#60](https://github.com/dcotelo/ChartImpact/issues/60)) ([62554cd](https://github.com/dcotelo/ChartImpact/commit/62554cd257467fd5350bbe3c1dc818e1fea2ed52))
* Remove trailing whitespace from Go code to pass formatting checks ([78cbca4](https://github.com/dcotelo/ChartImpact/commit/78cbca4cf8f0b17b2b8d6584fc48ba5f07900050))
* Resolve TypeScript errors and add demo examples ([18123a7](https://github.com/dcotelo/ChartImpact/commit/18123a7edc92ecf1f7eda87242ca9016db0c752d))
* streamline release configuration by consolidating backend and frontend settings ([#63](https://github.com/dcotelo/ChartImpact/issues/63)) ([eaaf6d7](https://github.com/dcotelo/ChartImpact/commit/eaaf6d79030128cb1197b0b4e241281f76b31a65))
* update import paths to reflect repository ownership change ([5c8254d](https://github.com/dcotelo/ChartImpact/commit/5c8254df44f098e645bb4f9b98f874672c398da8))
* update release configuration to include component in tag ([#65](https://github.com/dcotelo/ChartImpact/issues/65)) ([11d5dff](https://github.com/dcotelo/ChartImpact/commit/11d5dff1a0d0b0e598901e62ee07baed0399eeab))
* Use useEffect to update expanded state when diff changes ([cc98fb6](https://github.com/dcotelo/ChartImpact/commit/cc98fb646d92165be6c032a3a0816cde3a2fd691))

## [1.1.0](https://github.com/dcotelo/ChartImpact/compare/chartimpact-v1.0.0...chartimpact-v1.1.0) (2025-12-28)


### Features

* add ChartInspect image to README files for better visualization ([698aeed](https://github.com/dcotelo/ChartImpact/commit/698aeed76d03f2474902cff075224a9822383133))
* Add checkbox to ignore label changes in diff output ([ef46e67](https://github.com/dcotelo/ChartImpact/commit/ef46e674ef60f723182dc7213905ed86e6dcc29a))
* Add collapsible resource groups and green/red diff coloring ([fb58f5e](https://github.com/dcotelo/ChartImpact/commit/fb58f5e7ebc01f03277784818d9bc07ce9f3ce68))
* Add detailed progress tracking, color-coded diff display, and demo values ([bdded6c](https://github.com/dcotelo/ChartImpact/commit/bdded6c8cd3725174bde68286107c95c95bc7153))
* Add executive summary before categorized diff display ([44b10e1](https://github.com/dcotelo/ChartImpact/commit/44b10e11699cc26f30f6eea72dc29c1a2cc2fdf4))
* Add GitHub Actions workflows for CI/CD ([1248328](https://github.com/dcotelo/ChartImpact/commit/1248328a0516740b8c2e1c19a9c8805b9c017a71))
* Add individual resource collapse/expand within each resource type ([ba1cd59](https://github.com/dcotelo/ChartImpact/commit/ba1cd59805450824ba60ca07ec4807788441a464))
* Add progress indicators and enhance error display ([6c41de4](https://github.com/dcotelo/ChartImpact/commit/6c41de4b80338183562eb49bb04bab91cfd59a60))
* Add progress indicators, improve error handling, and update to ArgoCD examples ([b4c051f](https://github.com/dcotelo/ChartImpact/commit/b4c051f8a37f392995d6fd2bd3d953ab97a4518c))
* Enhance Helm and dyff installation in Dockerfile ([7f05454](https://github.com/dcotelo/ChartImpact/commit/7f054547dcdd7232dd6f241952c959947cb0b529))
* initialize frontend with Next.js and TypeScript setup ([061bbc4](https://github.com/dcotelo/ChartImpact/commit/061bbc4d3cb46df2c1fbbd8ac537d0111593cc02))
* Parse dyff-style diff output with resource paths and identifiers ([0fa4547](https://github.com/dcotelo/ChartImpact/commit/0fa45472db997395a054b7ca924e20f41533190b))
* Revamp diff grouping with intelligent categories ([2a034fb](https://github.com/dcotelo/ChartImpact/commit/2a034fbbbfef8265e673aef3bcf38811a40e63b0))
* update ChartInspect logo image ([d958c48](https://github.com/dcotelo/ChartImpact/commit/d958c48cabaf4520c1a226b5799820043709f1e4))
* update CI workflow to use actions/upload-artifact@v4 and refactor API call in compare route ([921f329](https://github.com/dcotelo/ChartImpact/commit/921f329a0d7a3ee4a3b505754936149e63a8fff7))
* Update demo examples to use ArgoCD Helm charts ([fabdab3](https://github.com/dcotelo/ChartImpact/commit/fabdab3c1467bc826cc62aea44975b0c3c49c899))
* Update DiffDisplay and CompareForm components for improved UI and functionality ([4ef0483](https://github.com/dcotelo/ChartImpact/commit/4ef0483c848d685673118450e29edc8e6c822a76))


### Bug Fixes

* Add Helm dependency building before template rendering ([5e13087](https://github.com/dcotelo/ChartImpact/commit/5e13087e04225f8c1fea0b9934d37c54d8a5c410))
* Complete individual resource collapse functionality ([5280450](https://github.com/dcotelo/ChartImpact/commit/5280450e55731dbd68d2a76b0242f76c0a54e31e))
* Correct useEffect dependencies for expand state ([cdd7c0c](https://github.com/dcotelo/ChartImpact/commit/cdd7c0c9c4a2b6ba74023fcdff01b8737cf3683b))
* frontend/package.json & frontend/package-lock.json to reduce vulnerabilities ([99c2ac7](https://github.com/dcotelo/ChartImpact/commit/99c2ac703b111f1bef8fe3ac14659955c0214820))
* Improve Helm dependency building with better error handling ([057e4ff](https://github.com/dcotelo/ChartImpact/commit/057e4ff2aeefde7e88a3401a2acb1b1804f3a7ac))
* Improve label filtering logic for dyff format ([058bcd9](https://github.com/dcotelo/ChartImpact/commit/058bcd9d7021ca5b5c4d73c31c453dc4e0887b1b))
* Improve useEffect dependency to properly expand groups on new comparison ([b06275f](https://github.com/dcotelo/ChartImpact/commit/b06275fd903e14bd1086dbde98359ee6abfe4f13))
* Initialize expanded state properly in DiffDisplay ([5a564b5](https://github.com/dcotelo/ChartImpact/commit/5a564b559ec4ff7e0d673772a75b73676117ae39))
* Preserve first character of diff lines that don't have + or - markers ([dfc3f92](https://github.com/dcotelo/ChartImpact/commit/dfc3f927091b7da0a71286e0685c0523d0bf7670))
* Release process ([#60](https://github.com/dcotelo/ChartImpact/issues/60)) ([62554cd](https://github.com/dcotelo/ChartImpact/commit/62554cd257467fd5350bbe3c1dc818e1fea2ed52))
* Remove trailing whitespace from Go code to pass formatting checks ([78cbca4](https://github.com/dcotelo/ChartImpact/commit/78cbca4cf8f0b17b2b8d6584fc48ba5f07900050))
* Resolve TypeScript errors and add demo examples ([18123a7](https://github.com/dcotelo/ChartImpact/commit/18123a7edc92ecf1f7eda87242ca9016db0c752d))
* streamline release configuration by consolidating backend and frontend settings ([#63](https://github.com/dcotelo/ChartImpact/issues/63)) ([eaaf6d7](https://github.com/dcotelo/ChartImpact/commit/eaaf6d79030128cb1197b0b4e241281f76b31a65))
* update import paths to reflect repository ownership change ([5c8254d](https://github.com/dcotelo/ChartImpact/commit/5c8254df44f098e645bb4f9b98f874672c398da8))
* Use useEffect to update expanded state when diff changes ([cc98fb6](https://github.com/dcotelo/ChartImpact/commit/cc98fb646d92165be6c032a3a0816cde3a2fd691))

## Changelog

All notable changes to ChartImpact will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## About

ChartImpact is a monorepo containing:
- **Backend**: Go-based API service for Helm chart comparison
- **Frontend**: Next.js web application

Each component has its own CHANGELOG:
- [Backend CHANGELOG](backend/CHANGELOG.md)
- [Frontend CHANGELOG](frontend/CHANGELOG.md)
