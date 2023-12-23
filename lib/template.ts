
export function template(
  text: string, variables: any = {},
  defaultValue = ''): string {
  return text.replace(
      /\${(\w+)}/g,
      (_, key) => String(variables[key] ?? defaultValue));
}
