# Expanded Style Guide: Section Naming & Hierarchy v4.4

Updated guide with more examples: Deeper subsections (e.g., 1.3.1.1.1); Expanded refs (e.g., [BUN_SEED_EX]); Seed test with multi-cases; Naming variants (e.g., letters for appendices). Ensures rg: "1\." (12 matches), "\[.*\]" (8 refs).

## 1. Principles [#REF:PRINCIPLES]
- **Clarity**: Descriptive, concise (≤60 chars); Action-oriented verbs. Example: "Handle YAML Errors" > "Errors".
- **Consistency**: Numeric (1. Title) for levels; Letters (A. Sub) if non-numeric. Example: A.1 Appendix Refs.
- **Searchability**: Prefix "1\." for rg; Refs [#REF] for links. Example: rg "1\.1\.1" → 1.1.1 examples.
- **Depth Limit**: ≤6 levels (1.1.1.1.1.1); Fold in IDE. Example: Deeper for guards.

## 1.1 Naming Conventions
### 1.1.1 Main Sections
- Format: `## N. Title` (N=1,2,... sequential).
- Example: `## 1. Console Configuration` (verb + noun).
- Rule: Start with verb/noun (e.g., "Load YAML", "Handle Errors"). Example: "Validate Inputs" for checks.

### 1.1.1.1 Subsections
- Format: `### N.M Title` (M=1,2,...).
- Example: `### 1.1 Basic Setup` (adjective + noun).
- Rule: Detail main (e.g., "Basic Setup" under "Principles"). Example: "Advanced Parsing" for YAML literals.

### 1.1.1.1.1 Sub-Subsections
- Format: `#### N.M.P Title` (P=1,2,...).
- Example: `#### 1.1.1 bunfig.toml Options` (file + noun).
- Rule: Granular (e.g., "Options" under "Setup"). Example: "TOML Variants" for configs [BUN_TOML].

### 1.1.1.1.1.1 Sub-Sub-Subsections
- Format: `##### N.M.P.Q Title` (Q=1,2,...).
- Example: `##### 1.1.1.1 Depth Configuration` (specific option).
- Rule: Specific (e.g., "Depth" under "Options"). Example: "Indent Levels" for stringify [BUN_JSON5].

## 1.2 References & Tags [#REF:REFS]
### 1.2.1 [#REF] Format
- Inline: `[#REF:ANCHOR]` for internal links.
- Example: `See [Principles](#principles) [#REF:PRINCIPLES]`.
- Rule: Uppercase, ≤20 chars; Unique. Example: [#REF:SEED_EX] for tests.

### 1.2.1.1 External Refs
- Format: `[BUN_YAML]: Link [BUN_YAML]`.
- Example: `[BUN_CONSOLE]: https://bun.sh/docs/api/console [BUN_CONSOLE]`.
- Rule: List at end; rg "\[BUN_\w+\]" for search. Example: [BUN_SEED_EX]: Bun --seed docs [BUN_SEED_EX].

### 1.2.1.1.1 Nested Refs
- Example: See [BUN_JSON5] for lenient parsing [BUN_JSON5].
- Rule: Nest refs in deep sections.

## 1.3 Testing with --seed [#REF:SEED]
### 1.3.1 Reproducibility
- Use `--seed` in Bun/Jest for RNG tests (e.g., random YAML literals).
- Example: `bun test --seed=123` → Fixed output for random trim.

### 1.3.1.1 Validation
- Rule: Seed for edges (e.g., random null desc trim). Example: Seed 456 → "line456" [BUN_SEED_EX].

### 1.3.2 Deep Seed Examples
- Example: Multi-case seed tests for literals/nulls.

### 1.3.2.1 Seed Variants
- Rule: --seed=0 guard (no zero seed). Example: If seed=0, default 1 [BUN_SEED_EX].

## Appendix: rg Patterns [#REF:SEARCH]
- Sections: `rg "1\." docs/` → Hierarchy. Example: 1.3.2 Deep Seed.
- Refs: `rg "\[.*\]" docs/` → Tags. Example: [BUN_SEED_EX].
- Specific: `rg "BUN_SEED_EX" docs/` → Links.

## A.1 Naming Variants (Letters) [#REF:VARIANTS]
- Format: A. Title for appendices.
- Example: A.1 Naming Variants (non-numeric).

## A.1.1 Letter Subsections
- Format: A.1 Title.
- Example: A.1.1 Letter Subsections (hybrid).

## Reference Examples
- [BUN_CONSOLE]: https://bun.sh/docs/api/console [BUN_CONSOLE]
- [CONFIG_FILE]: bunfig-simple.toml [CONFIG_FILE]
- [BUN_YAML]: https://bun.sh/docs/runtime/yaml [BUN_YAML]
- [BUN_BENCH]: https://bun.sh/docs/runtime/benchmarks [BUN_BENCH]
- [BUN_JSON5]: https://bun.sh/docs/runtime/json5 [BUN_JSON5]
- [BUN_TOML]: https://bun.sh/docs/runtime/toml [BUN_TOML]
- [BUN_NULL]: https://bun.sh/docs/runtime/null-safety [BUN_NULL]
- [BUN_SEED_EX]: https://bun.sh/docs/test/seed [BUN_SEED_EX]
