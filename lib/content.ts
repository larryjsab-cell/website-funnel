import landing from "@/content/landing.json";
import faq from "@/content/faq.json";
import testimonials from "@/content/testimonials.json";
import examples from "@/content/examples.json";
import ui from "@/content/ui.json";
import forms from "@/content/forms.json";
import styles from "@/content/styles.json";
import legal from "@/content/legal.json";

export { landing, faq, testimonials, examples, ui, forms, styles, legal };

export type FaqItem = (typeof faq)["groups"][number]["items"][number];
export type ExampleItem = (typeof examples)["items"][number];

export const allFaqItems: FaqItem[] = faq.groups.flatMap((g) => g.items);

export function faqByIds(ids: string[]): FaqItem[] {
  return ids
    .map((id) => allFaqItems.find((item) => item.id === id))
    .filter((item): item is FaqItem => Boolean(item));
}
