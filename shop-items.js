/*
  NIRVANAM STUDIO: EVERYTHING YOU EDIT LIVES IN THIS FILE
  =======================================================
  Part 1: the pieces in the shop.
  Part 2: the trees and regeneration numbers on the "Every piece plants trees" tab.

  Edit this file on GitHub (open it, tap the pencil icon), then "Commit changes".
  The site updates within a minute or two.

  --------------------------------------------------------------------------
  PART 1: PIECES
  --------------------------------------------------------------------------
  Copy one block from { to }, including the comma after it, and change the details.

  id          short, unique, lowercase, hyphens only. It becomes the piece's link:
              nirvanamstudio.com/shop.html#teak-almirah-01
  title       the name shown on the card
  category    "Furniture", "Doors & pillars", "Brass & lamps", "Collectables" ... (makes filter buttons)
  status      "sourcing"  shows "Just found"
              "restoring" shows "Being prepared"
              "ready"     shows "Ready to ship"
              "reserved"  shows "Reserved" (button becomes "Join the waiting list")
  photos      file paths in /shop/images/, main photo first. Leave [] until you have them.
  price       delivered price in each currency, numbers only, no symbols or commas.
              Take them from column E of the margin model Sheet ("Customer pays inc. VAT"):
              UK and EU shoppers must see prices that include VAT.
              Leave out any currency you do not want to show. Leave out price entirely
              to show "Price confirmed when ready".
  material    name the wood here, as specifically as you can stand behind:
              "Burma teak", "Rosewood", "Satinwood". If you are not sure, say so:
              "Tropical hardwood, probably teak". A wrongly named wood is a
              misdescription buyers can claim a refund for.
              Rosewood (Dalbergia) is CITES-listed and may need an export permit:
              check with the forwarder before you list a rosewood piece.
  Everything else is optional: leave out any line you do not have yet.

  THE LIST STARTS EMPTY, so the page shows "The first pieces are being chosen now".
  The three example blocks below are switched off. To add your first piece, copy one
  example and paste it on the line marked PASTE PIECES HERE, then change the details.
*/
window.NIRVANAM_ITEMS = [

  // PASTE PIECES HERE

  /* ---------- EXAMPLES (switched off: everything between here and END EXAMPLES is ignored) ----------
  {
    id: "teak-almirah-01",
    title: "Burma teak almirah with carved cornice",
    category: "Furniture",
    status: "restoring",
    period: "Mid 20th century",
    material: "Burma teak, original brass fittings",
    dimensions: "H 195 x W 110 x D 52 cm",
    condition: "Sound. Old repair to the left door, re-waxed.",
    description: "A two-door wardrobe from a Karaikudi merchant family, with hand-cut dovetails and its original lock plate still turning.",
    price: { gbp: 1780, eur: 2180, usd: 2730 },
    photos: ["shop/images/teak-almirah-01-a.jpg", "shop/images/teak-almirah-01-b.jpg"]
  },
  {
    id: "planters-chair-01",
    title: "Planter's chair with cane seat",
    category: "Furniture",
    status: "sourcing",
    period: "Mid 20th century",
    material: "Teak, newly re-caned",
    dimensions: "H 98 x W 64 x D 140 cm (arms out)",
    condition: "New cane, frame tight.",
    description: "The long-armed verandah chair of every Chettinad thinnai, built for afternoons that do not end.",
    photos: []
  },
  {
    id: "enamelware-set-01",
    title: "Enamelware tiffin set, 6 pieces",
    category: "Collectables",
    status: "ready",
    period: "1950s",
    material: "Enamelled steel",
    condition: "Small chips to rims, colours still bright.",
    description: "Imported enamelware filled Chettiar dowry chests. A matched set in green and cream.",
    price: { gbp: 120, eur: 145, usd: 160 },
    photos: []
  },
  ---------- END EXAMPLES ---------- */
];

/*
  --------------------------------------------------------------------------
  PART 2: TREES AND REGENERATION
  --------------------------------------------------------------------------
  profitShare     the share of profit from each piece that goes to planting.
                  Shown as "10% of the profit". Change it if you decide on another share.
  piecesSold      update after each sale
  treesWales      trees actually in the ground in Wales
  treesIndia      trees actually in the ground in India
  updated         the date you last changed the numbers, as "Month YYYY"

  The counter stays hidden and says "goes live with our first shipment"
  until piecesSold or a tree count is above 0. Only enter trees that are planted:
  the numbers are public and must be ones you can show.
*/
window.NIRVANAM_IMPACT = {
  profitShare: 10,
  piecesSold: 0,
  treesWales: 0,
  treesIndia: 0,
  updated: "November 2026"
};
