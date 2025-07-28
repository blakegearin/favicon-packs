# Favicon Replacement Strategies

This document explains the different strategies available for replacing favicons and when to use them.

## Basic Options

- **removeExistingIcons**: Removes existing favicon elements from the page.
- **addCssHiding**: Adds CSS rules to hide any favicons that might be dynamically added later.
- **addShortcutLink**: Adds both standard and shortcut icon links for better compatibility.

## Two Independent Strategies

The extension provides two completely independent strategies for maintaining your favicon. You can use either one, both, or neither depending on the specific site's behavior.

### Strategy 1: Mutation Observation (Proactive)

The `observeMutations` option uses the MutationObserver API to actively watch for DOM changes:

```js
observeMutations: {
  enabled: true,
  attributeFilter: ['href', 'rel', 'src'],
  targetSelector: 'head // Optional
}
```

**How it works**: This strategy monitors the DOM for any changes that might affect favicons (new elements being added, attributes changing). When it detects relevant changes, it immediately triggers a favicon replacement.

**New targeting option**: The optional `targetSelector` property allows you to specify CSS selectors for elements to observe, instead of watching the entire document. This can dramatically improve performance on complex pages. For example, using `"head"` would only watch for changes in the document's head section.

**Best for**: Sites that dynamically update their favicons using JavaScript after the page loads.

### Strategy 2: Persistence Checking (Reactive)

The `persistence` option uses interval-based polling to periodically check if the favicon is still correctly set:

```js
persistence: {
  enabled: true,
  checkIntervalTime: 400,
  randomizationFactor: 0.2,
  retryLimit: 5
}
```

**How it works**: This strategy sets up a timer that regularly verifies if the favicon is still correctly set. If it's not, it attempts to restore it.

**Best for**: Sites with scripts that replace favicons at unpredictable times or in ways that might be missed by the mutation observer.

## Choosing the Right Strategy

These strategies solve the same problem in different ways:

- **Mutation Observation** is more efficient but might miss some changes.
- **Persistence Checking** is more thorough but uses more resources.

You can configure each site differently:

- **For most sites**: Either strategy alone is often sufficient, with mutation observation being the more efficient choice.
- **For aggressive sites**: Some sites actively fight favicon changes. For these, using both strategies together provides the best chance of maintaining your chosen favicon.
- **For performance**: If you're concerned about performance, you might disable persistence checking and rely only on mutation observation.
- **For reliability**: If a site keeps changing its favicon in a way that mutation observation doesn't catch, enable persistence checking with a higher retry limit.

## Additional Options for Single-Page Applications

```js
urlChangeDetection: {
  enabled: true,
  checkIntervalTime: 1000
}
```

This is a third, independent option specifically for single-page applications (SPAs) that don't fully reload the page when navigating between different sections. It ensures that favicon changes are applied when the URL changes, even without a full page reload.
