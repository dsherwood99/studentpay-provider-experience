type KitDisclosureProps = {
  text: string;
};

export function KitDisclosure({ text }: KitDisclosureProps) {
  if (!text) {
    return null;
  }

  return <p className="catalogue-kit-disclosure">{text}</p>;
}
