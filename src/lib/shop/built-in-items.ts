// Seeded social-reward items. These are the built-in TumbaNet "rewards shop"
// experiences. Identified by a stable `builtInKey` so the seed script is
// idempotent (re-running never creates duplicates).
//
// To add/remove/tune a built-in: edit this list, then run `node scripts/seed-shop.js`.

export interface BuiltInShopItem {
  builtInKey: string;
  title: string;
  description: string;
  price: number;
  category: string;
}

export const BUILT_IN_SHOP_ITEMS: BuiltInShopItem[] = [
  {
    builtInKey: "weekend_driving_exemption",
    title: "Weekend Driving Exemption",
    description: "Redeem once — you get a full weekend off driving duty, no guilt, no questions.",
    price: 120,
    category: "exemption",
  },
  {
    builtInKey: "beer_on_the_group",
    title: "Someone Buys You a Beer",
    description: "Cash this in and the next round lands on someone else's tab. Cheers.",
    price: 60,
    category: "treat",
  },
  {
    builtInKey: "shot_on_the_group",
    title: "Someone Buys You a Shot",
    description: "A free shot, whenever you call it in. Legendary value per coin.",
    price: 50,
    category: "treat",
  },
  {
    builtInKey: "pickup_ride",
    title: "Free Pickup Ride",
    description: "Someone from the group comes and picks you up — no arguments, no tax.",
    price: 100,
    category: "favor",
  },
  {
    builtInKey: "designated_driver_exemption",
    title: "Designated Driver Exemption",
    description: "Skip your turn as the designated driver for one night out.",
    price: 140,
    category: "exemption",
  },
  {
    builtInKey: "cleaning_duty_exemption",
    title: "Cleaning Duty Exemption",
    description: "Your post-party cleanup obligation vanishes for one event.",
    price: 90,
    category: "exemption",
  },
  {
    builtInKey: "music_dictator",
    title: "Music Dictator",
    description: "Full, unchallenged control of the playlist for an entire night.",
    price: 150,
    category: "power",
  },
  {
    builtInKey: "venue_picker",
    title: "Venue Picker",
    description: "You pick where the group goes next. Everyone has to show up.",
    price: 170,
    category: "power",
  },
  {
    builtInKey: "activity_chooser",
    title: "Activity Chooser",
    description: "Decide the next group activity. The group is contractually obligated.",
    price: 140,
    category: "power",
  },
  {
    builtInKey: "command_hour",
    title: "Command Hour",
    description: "For one hour, the group has to do (reasonable) things you say. One hour only.",
    price: 220,
    category: "power",
  },
  {
    builtInKey: "king_pass",
    title: "King Pass",
    description: "A full day of royal treatment — drinks brought, seats saved, jokes laughed at.",
    price: 400,
    category: "legendary",
  },
  {
    builtInKey: "vip_night",
    title: "VIP Night",
    description: "One night out where you are the VIP. The group plans around you.",
    price: 500,
    category: "legendary",
  },
];
