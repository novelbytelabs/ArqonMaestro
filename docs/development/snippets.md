# Snippets

Snippets are a structured part of the custom-command surface. They let you define generated templates rather than imperative callbacks.

> Video placeholder: creating and invoking a snippet.

## Snippet Registration

The custom builder exposes:

```js
snippet(templated, generated, options?, snippetType?, disabled?)
```

## What Snippets Are Good For

- repeatable boilerplate
- language-specific templates
- test scaffolding
- ecosystem-specific code generation patterns

## Slot Formatting

Snippet templates can include placeholders such as:

- `<%identifier%>`
- `<%newline%>`
- `<%indent%>`

Formatting options can constrain how spoken values are rendered.

## Example

```js
builder.language("python").snippet(
  "test method <%identifier%>",
  "def test_<%identifier%>(self):<%newline%><%indent%>pass",
  { identifier: ["underscores"] },
  "method"
);
```

## Strategic Use In Arqon

Snippets are one of the most practical ways to encode ecosystem-specific workflows without having to modify the core recognition stack.
