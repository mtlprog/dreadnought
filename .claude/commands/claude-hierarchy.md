# Show CLAUDE.md Inheritance Hierarchy

Display the complete inheritance chain of CLAUDE.md files and calculate cumulative token usage.

## Instructions

1. **Map the hierarchy** starting from current directory
2. **Show inheritance path** for any given file location
3. **Calculate cumulative tokens** that would be loaded at each level
4. **Identify potential conflicts** where child rules might contradict parent rules

```
Output a visual tree showing:
/ (root)
├── CLAUDE.md [~500 tokens]
├── apps/
│   ├── CLAUDE.md [~300 tokens, cumulative: ~800]
│   ├── web-app/
│   │   └── CLAUDE.md [~200 tokens, cumulative: ~1000]
│   └── api/
│       └── CLAUDE.md [~400 tokens, cumulative: ~900]
└── packages/
├── CLAUDE.md [~250 tokens, cumulative: ~750]
└── shared-ui/
└── CLAUDE.md [~300 tokens, cumulative: ~1050]
```

5. Highlight any paths where cumulative tokens exceed 2000 (context budget warning).
