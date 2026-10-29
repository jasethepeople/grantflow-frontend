import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { DOMParser as PMDOMParser, DOMSerializer } from "prosemirror-model";
import type { Node as PMNode } from "prosemirror-model";

// The schema shared by every editor instance and by (de)serialization helpers.
export const collabSchema: Schema = basicSchema;

export function htmlToDoc(html: string, schema: Schema = collabSchema): PMNode {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html || "<p></p>";
  return PMDOMParser.fromSchema(schema).parse(wrapper);
}

export function docToHTML(doc: PMNode, schema: Schema = collabSchema): string {
  const serializer = DOMSerializer.fromSchema(schema);
  const fragment = serializer.serializeFragment(doc.content);
  const wrapper = document.createElement("div");
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}
