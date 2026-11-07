export type Platform = "instagram" | "tiktok";
export type Format = "Image" | "Carousel" | "Video";
export type Tone = "mint" | "lavender" | "peach" | "yellow";

export type VisualLayout =
  | 'bold-editorial'
  | 'cinematic-bleed'
  | 'framed-minimal'
  | 'split-card'
  | 'product-spotlight'
  | 'quote-manifesto';

export type AdFormat = 'leaderboard' | 'billboard' | 'large-rectangle' | 'medium-rectangle' | 'half-page' | 'skyscraper' | 'mobile-banner';
export type AspectRatioFormat = 'square' | 'portrait' | 'vertical' | 'landscape' | AdFormat;
export type HeadlineSize = 'small' | 'medium' | 'large' | 'hero' | 'display';
export type LogoSize = 'small' | 'medium' | 'large' | 'xlarge';
export type LogoPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom' | 'hidden';
export type ContentDensity = 'compact' | 'normal' | 'spacious';

export type CarouselSlide = {
  id: string;
  headline: string;
  supportingCopy?: string;
  image?: string;
  mediaKind?: 'image' | 'video';
  cta?: string;
  badge?: string;
};

export type Variant = {
  caption: string;
  hashtags: string;
  cta: string;
  notes: string;
};

export type ContentTemplate = {
  id: string;
  title: string;
  headline: string;
  /** Optional visual-editor copy; older templates fall back to brand/caption values. */
  eyebrow?: string;
  supportingCopy?: string;
  cta?: string;
  campaign: string;
  theme: string;
  format: Format;
  platforms: Platform[];
  image: string;
  tone: Tone;
  variants: Record<Platform, Variant>;
  sourceUrl?: string;
  mediaKind?: 'image' | 'video';
  layout?: VisualLayout;
  aspectRatio?: AspectRatioFormat;
  textAlign?: 'left' | 'center' | 'right';
  overlayOpacity?: number;
  badge?: string;
  showLogo?: boolean;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  headlineFontSize?: HeadlineSize;
  headlineUppercase?: boolean;
  contentPadding?: ContentDensity;
  headingFont?: string;
  bodyFont?: string;
  slides?: CarouselSlide[];
};

// Campaign labels group reusable ideas; they do not represent scheduled campaigns.
// Only platforms listed in `platforms` are supported for a template's format.
export const templates: ContentTemplate[] = [
  {
    id: "pocket-origin",
    title: "The pocket story",
    headline: "STARTED ON CONCRETE",
    campaign: "Always Starving",
    theme: "Brand story",
    format: "Carousel",
    platforms: ["instagram"],
    image: "/brand/men.webp",
    tone: "mint",
    variants: {
      instagram: {
        caption:
          "Before urban armor, there was a chest pocket and a life on concrete. Hungry Pockets started with that detail and a bigger appetite: for movement, growth, and whatever comes next. Always Starving Since 2014.",
        hashtags:
          "#HungryPockets #AlwaysStarving #BrandStory #StreetwearCulture #UrbanStyle",
        cta: "Swipe through the origin. What detail makes a piece yours? Discover the collection at hungrypockets.eu.",
        notes:
          "Build four slides: concrete setting, chest-pocket origin in type, full outfit, tagline. Use the supplied men photo for the outfit slide. Only add a pocket close-up if the photographed garment actually shows one; otherwise keep that slide typographic.",
      },
      tiktok: {
        caption:
          "One chest pocket. A start on concrete. A mindset that kept moving. This is the Hungry Pockets origin.",
        hashtags: "#HungryPockets #AlwaysStarving #StreetwearStory #Streetwear",
        cta: "Tell us the detail you always notice first. Discover the collection at hungrypockets.eu.",
        notes:
          "Instagram carousel only. This is alternate copy for a future video adaptation, not a ready-to-post TikTok asset. A new sequence could pair concrete textures with the origin written on screen.",
      },
    },
  },
  {
    id: "off-duty-uniform",
    title: "Off-duty uniform",
    headline: "STILL ON YOUR PATH",
    campaign: "The everyday edit",
    theme: "Outfit inspiration",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/men.webp",
    tone: "lavender",
    variants: {
      instagram: {
        caption:
          "Clock out. Stay yourself. An easy streetwear fit for the walk home, the next idea, and the hours that belong to you. The official uniform of the hustle does not need an office.",
        hashtags:
          "#HungryPockets #EverydayStyle #OffDutyStyle #StreetwearOutfit #OutfitInspiration",
        cta: "Save this for your next off-duty outfit. Discover the collection at hungrypockets.eu.",
        notes:
          "Shoot a short vertical Reel: full-body still, walking side profile, then a relaxed seated frame. Keep the same outfit throughout and leave space above the subject for the headline. The men photo is a cover reference, not existing footage.",
      },
      tiktok: {
        caption:
          "The workday ends. Your style does not. One off-duty fit, three moments on the way home.",
        hashtags: "#HungryPockets #OffDutyFit #Streetwear #OutfitCheck",
        cta: "Where does your off-duty outfit take you? Discover the collection at hungrypockets.eu.",
        notes:
          "Record three vertical clips in one location: standing, walking, sitting. Open on the complete fit rather than a logo screen. Add the line “Off the clock. Still moving.” as text and keep cuts simple.",
      },
    },
  },
  {
    id: "detail-check",
    title: "Detail check",
    headline: "LOOK A LITTLE CLOSER",
    campaign: "Meet the essentials",
    theme: "Product spotlight",
    format: "Carousel",
    platforms: ["instagram"],
    image: "/brand/windbreaker.png",
    tone: "peach",
    variants: {
      instagram: {
        caption:
          "The full fit gets your attention. The details make you look again. Meet the Hungry Pockets unisex windbreaker, from the overall shape to the features you can actually see.",
        hashtags:
          "#HungryPockets #Windbreaker #StreetwearDetails #UnisexStyle #ProductSpotlight",
        cta: "Swipe for a closer look, then explore the windbreaker on hungrypockets.eu.",
        notes:
          "Use three slides: full supplied product image, a high-resolution crop of a visible detail, and the full image with the product name. Do not label waterproofing, insulation, fabric composition, or hidden features without verified product information.",
      },
      tiktok: {
        caption:
          "Zoom out for the shape. Zoom in for the detail. Meet the unisex windbreaker.",
        hashtags: "#HungryPockets #Windbreaker #StreetwearDetails #StyleCheck",
        cta: "Which detail caught your eye? Discover the collection at hungrypockets.eu.",
        notes:
          "Instagram carousel only. For a later TikTok adaptation, film the actual garment in wide and close-up shots; do not present static crops as footage of tested performance.",
      },
    },
  },
  {
    id: "street-ready",
    title: "Street ready",
    headline: "YOUR CITY YOUR PACE",
    campaign: "The everyday edit",
    theme: "Outfit inspiration",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/windbreaker.png",
    tone: "mint",
    variants: {
      instagram: {
        caption:
          "A layer. A direction. Your own pace. Take the unisex windbreaker into an everyday city fit and let the street be the backdrop, not the dress code.",
        hashtags:
          "#HungryPockets #CityStyle #Windbreaker #UrbanOutfit #StreetwearInspiration",
        cta: "Save the layer idea for your next city day. Discover the collection at hungrypockets.eu.",
        notes:
          "Film an outfit reveal, a walking shot, and a front-facing pause against a plain urban wall. Show the windbreaker clearly in natural light. Use safe public locations and avoid implying tested weather protection.",
      },
      tiktok: {
        caption:
          "Build a city fit around one windbreaker. No complicated transition needed.",
        hashtags: "#HungryPockets #CityFit #Windbreaker #FitCheck #Streetwear",
        cta: "Would you style it open or closed? Discover the collection at hungrypockets.eu.",
        notes:
          "Start with the windbreaker on a hanger, cut to the complete outfit, then show open and closed styling if the garment permits it. Film actual footage; the product image can serve as the cover.",
      },
    },
  },
  {
    id: "crop-energy",
    title: "Crop top energy",
    headline: "TAKE UP SPACE",
    campaign: "Meet the essentials",
    theme: "Product spotlight",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/crop-top.png",
    tone: "peach",
    variants: {
      instagram: {
        caption:
          "A shorter silhouette. Your full presence. Put the Hungry Pockets women’s crop top at the center of a fit that feels like you, whether you keep it simple or add another layer.",
        hashtags:
          "#HungryPockets #CropTop #WomensStreetwear #StreetwearStyle #OutfitIdeas",
        cta: "Save this styling idea or explore the crop top on hungrypockets.eu.",
        notes:
          "Shoot the crop top laid flat, a waist-up styled view, and a full outfit. Keep framing respectful and show the actual garment silhouette. Add a jacket for the last shot if available; it is styling, not part of the product.",
      },
      tiktok: {
        caption:
          "One crop top, two styling directions: keep it simple or add a layer. Which one feels more like you?",
        hashtags: "#HungryPockets #CropTopOutfit #WomensStreetwear #StyleIdeas",
        cta: "Pick simple or layered in the comments. Discover the collection at hungrypockets.eu.",
        notes:
          "Film two looks with the same crop top and label them “Simple” and “Layered.” Use matching camera position for an easy cut. Do not digitally invent alternate product colors.",
      },
    },
  },
  {
    id: "top-it-off",
    title: "Top it off",
    headline: "FINISH THE FIT",
    campaign: "Meet the essentials",
    theme: "Product spotlight",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/dad-hat.png",
    tone: "yellow",
    variants: {
      instagram: {
        caption:
          "Sometimes the last piece is the one that brings the whole outfit together. Meet the Hungry Pockets dad hat: a starting point for your next finishing touch.",
        hashtags:
          "#HungryPockets #DadHat #StreetwearAccessories #OutfitDetails #EverydayStyle",
        cta: "Save the finishing touch. How would you style yours? Discover the collection at hungrypockets.eu.",
        notes:
          "Shoot a neutral outfit without the hat, a close-up of the actual dad hat, then the same outfit with it on. Keep the camera locked for a clean before-and-after cut. Use the supplied dad-hat image as the cover.",
      },
      tiktok: {
        caption: "Same outfit. One dad hat. A different finish.",
        hashtags: "#HungryPockets #DadHat #FitCheck #StyleSwitch #Streetwear",
        cta: "Hat on or hat off? Discover the collection at hungrypockets.eu.",
        notes:
          "Open with the finished look, then cut back to the outfit without the hat and repeat the reveal. Keep the change limited to the hat so viewers can compare the styling.",
      },
    },
  },
  {
    id: "made-for-motion",
    title: "Keep moving",
    headline: "MOVE WITH PURPOSE",
    campaign: "Always Starving",
    theme: "Brand story",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/men.webp",
    tone: "mint",
    variants: {
      instagram: {
        caption:
          "Early gym. Late code. Another try on the board. Different routines, the same drive to keep going. Hungry Pockets is the official uniform of the hustle, whatever progress looks like for you.",
        hashtags:
          "#HungryPockets #AlwaysStarving #KeepMoving #StreetwearCulture #CreativeRoutine",
        cta: "What are you putting time into right now? Discover the collection at hungrypockets.eu.",
        notes:
          "Capture three lifestyle moments: arriving at a gym, hands at a keyboard, and a safe skate setup. Use willing participants and film the real garments. These scenes express the brand mindset, not technical sportswear claims.",
      },
      tiktok: {
        caption:
          "Your routine might be gym, code, skate, or something else entirely. The common part is showing up again.",
        hashtags:
          "#HungryPockets #AlwaysStarving #DailyRoutine #KeepGoing #Streetwear",
        cta: "Name the thing you keep showing up for. Discover the collection at hungrypockets.eu.",
        notes:
          "Start each of three quick clips with the same text pattern: “Early…”, “Late…”, “Again…”. End on “Always Starving Since 2014.” Avoid risky tricks; a board carry or push on safe ground is enough.",
      },
    },
  },
  {
    id: "stay-hungry",
    title: "Stay hungry",
    headline: "NEVER FULL",
    campaign: "Always Starving",
    theme: "Brand story",
    format: "Image",
    platforms: ["instagram"],
    image: "/brand/women.webp",
    tone: "lavender",
    variants: {
      instagram: {
        caption:
          "Not an empty plate. An unfinished idea. A skill you are still building. A direction you have not explored yet. Always Starving Since 2014 is an appetite for growth, not a finish line.",
        hashtags:
          "#HungryPockets #AlwaysStarving #GrowthMindset #StreetwearCulture #CreativeDrive",
        cta: "Save this for the days when the next step feels small. Discover the collection at hungrypockets.eu.",
        notes:
          "Use the supplied women photo with a restrained “NEVER FULL” heading and the tagline below. Leave the outfit visible and keep text off the face. This is a single-image post, not a video.",
      },
      tiktok: {
        caption:
          "Always starving for the next idea, the next skill, the next step. Hungry Pockets, since 2014.",
        hashtags: "#HungryPockets #AlwaysStarving #CreativeDrive #KeepGrowing",
        cta: "What do you want to get better at? Discover the collection at hungrypockets.eu.",
        notes:
          "Instagram image only. Alternate copy is provided for a future adaptation; record an original progress-focused sequence before publishing as a TikTok video.",
      },
    },
  },
  {
    id: "one-tee-three-fits",
    title: "One tee, three fits",
    headline: "ONE TEE THREE WAYS",
    campaign: "The everyday edit",
    theme: "Outfit inspiration",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/oversized.png",
    tone: "yellow",
    variants: {
      instagram: {
        caption:
          "Start with the oversized faded tee. Change the trousers, add a layer, switch the headwear. Three outfit directions, one familiar anchor. Personal style lives in how you put the pieces together.",
        hashtags:
          "#HungryPockets #OversizedTee #ThreeWaysToWear #StreetwearOutfits #StyleInspiration",
        cta: "Save the rotation and tell us your favorite: 1, 2, or 3. Discover the collection at hungrypockets.eu.",
        notes:
          "Film three full-body outfits using the same actual tee: simple trousers, a layered look, and a headwear-led look. Keep framing and lighting consistent. Other items are styling props, not an implied Hungry Pockets bundle.",
      },
      tiktok: {
        caption:
          "The oversized faded tee stays. Everything around it changes. Fit 1, 2, or 3?",
        hashtags:
          "#HungryPockets #OversizedTee #OutfitRotation #FitCheck #StyleIdeas",
        cta: "Vote 1, 2, or 3. Discover the collection at hungrypockets.eu.",
        notes:
          "Show all three finished looks in the opening beat, then give each a labeled full-body shot. Use simple cuts or a hand-cover transition. Do not recolor the tee between outfits.",
      },
    },
  },
  {
    id: "after-hours",
    title: "After hours",
    headline: "THE DRIVE STAYS ON",
    campaign: "Always Starving",
    theme: "Brand story",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/men.webp",
    tone: "lavender",
    variants: {
      instagram: {
        caption:
          "The city gets quieter. The idea gets louder. A sketch, a line of code, a plan for tomorrow: after-hours drive can be a small step, not an all-nighter. Stay hungry. Leave room to reset.",
        hashtags:
          "#HungryPockets #AfterHours #CreativeProcess #AlwaysStarving #UrbanStyle",
        cta: "What is your after-hours project? Discover the collection at hungrypockets.eu.",
        notes:
          "Film a desk detail, a relaxed outfit frame, and closing the notebook or laptop. Use a warm lamp and expose the garment clearly. Hide private screen content and finish with a reset, not a sleep-deprivation message.",
      },
      tiktok: {
        caption:
          "One more sketch. One useful line of code. Then a reset. Progress does not have to mean staying up all night.",
        hashtags: "#HungryPockets #AfterHours #CreativeRoutine #AlwaysStarving",
        cta: "What small step did you make today? Discover the collection at hungrypockets.eu.",
        notes:
          "Open on hands making something, reveal the outfit in a wider shot, then close the laptop or notebook. Add “Small step. Still progress.” on screen. Film your own work and keep confidential material out of view.",
      },
    },
  },
  {
    id: "beanie-season",
    title: "Beanie in rotation",
    headline: "CUFFED AND READY",
    campaign: "Meet the essentials",
    theme: "Product spotlight",
    format: "Image",
    platforms: ["instagram"],
    image: "/brand/beanie.png",
    tone: "peach",
    variants: {
      instagram: {
        caption:
          "A cuffed beanie. A fresh finishing touch. Bring the Hungry Pockets beanie into your headwear rotation and build the rest of the fit your way.",
        hashtags:
          "#HungryPockets #CuffedBeanie #BeanieStyle #StreetwearAccessories #Headwear",
        cta: "Explore the beanie on hungrypockets.eu.",
        notes:
          "Place the supplied beanie image on a simple contrasting background. Use the product name and a short heading; leave enough negative space to make the cuff visible. Avoid unsupported warmth or material claims.",
      },
      tiktok: {
        caption:
          "The cuffed beanie gets a spot in the rotation. What would you pair it with?",
        hashtags: "#HungryPockets #CuffedBeanie #Headwear #StreetwearStyle",
        cta: "Name your go-to beanie outfit. Discover the collection at hungrypockets.eu.",
        notes:
          "Instagram image only. For a future video adaptation, shoot the real beanie on its own and worn with a complete outfit; the supplied photo is not a finished clip.",
      },
    },
  },
  {
    id: "choose-your-fit",
    title: "Choose your fit",
    headline: "WHICH WAY TODAY",
    campaign: "The everyday edit",
    theme: "Outfit inspiration",
    format: "Carousel",
    platforms: ["instagram"],
    image: "/brand/women.webp",
    tone: "yellow",
    variants: {
      instagram: {
        caption:
          "Some days you start with the silhouette. Some days it is the layer. Sometimes it is the hat you reach for first. Swipe through a few Hungry Pockets starting points and choose the direction that feels like today.",
        hashtags:
          "#HungryPockets #OutfitInspiration #StreetwearStyle #StyleChoices #EverydayOutfits",
        cta: "Comment with your starting point: tee, crop, layer, or hat. Discover the collection at hungrypockets.eu.",
        notes:
          "Create a cover with the supplied women photo, then separate slides using /brand/oversized.png, /brand/crop-top.png, /brand/windbreaker.png, and /brand/cap.png. Label these as outfit starting points, not complete looks or bundled products.",
      },
      tiktok: {
        caption:
          "Do you build the outfit around a tee, a crop top, a layer, or a hat? Pick your starting point.",
        hashtags: "#HungryPockets #OutfitIdeas #Streetwear #PersonalStyle",
        cta: "Tell us which piece comes first. Discover the collection at hungrypockets.eu.",
        notes:
          "Instagram carousel only. A future TikTok version needs a filmed outfit-building sequence; do not imply these individual product images show finished fits.",
      },
    },
  },
  {
    id: "from-concrete",
    title: "From concrete",
    headline: "ROOTS TO URBAN ARMOR",
    campaign: "Always Starving",
    theme: "Brand story",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/windbreaker.png",
    tone: "mint",
    variants: {
      instagram: {
        caption:
          "Concrete roots. A forward-looking mindset. In 2026, the Hungry Pockets story evolves toward protection, utility, and urban armor, with the same appetite for growth underneath. Always Starving Since 2014.",
        hashtags:
          "#HungryPockets #AlwaysStarving #UrbanArmor #BrandEvolution #StreetwearCulture",
        cta: "What does your everyday uniform say about where you are going? Discover the collection at hungrypockets.eu.",
        notes:
          "Film concrete texture, a full streetwear look, and the windbreaker as a final detail. Use “Origins / Drive / Urban armor” as chapter labels. Protection and utility describe the brand direction; do not add impact, waterproof, or safety-performance claims.",
      },
      tiktok: {
        caption:
          "Started on concrete. Still moving forward. Hungry Pockets in 2026: protection, utility, urban armor as a streetwear direction.",
        hashtags: "#HungryPockets #UrbanArmor #StreetwearStory #AlwaysStarving",
        cta: "Describe your everyday uniform in three words. Discover the collection at hungrypockets.eu.",
        notes:
          "Use three original clips labeled “Concrete roots,” “Keep growing,” and “Urban armor.” End with a real outfit shot. Do not use protective-equipment demonstrations or claim the garments provide certified protection.",
      },
    },
  },
  {
    id: "meet-the-pocket",
    title: "Meet the mindset",
    headline: "MORE THAN A POCKET",
    campaign: "Always Starving",
    theme: "Brand story",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/oversized.png",
    tone: "peach",
    variants: {
      instagram: {
        caption:
          "The name began with a chest pocket. The mindset goes further: keep learning, keep making, keep finding your next move. Hungry Pockets is streetwear for an appetite that is about growth.",
        hashtags:
          "#HungryPockets #BrandStory #AlwaysStarving #StreetwearMindset #CreativeDrive",
        cta: "Send this to someone who is always building something. Discover the collection at hungrypockets.eu.",
        notes:
          "Make a text-led vertical edit using the supplied tee image as a visual anchor and original concrete or work-in-progress clips. Sequence “A pocket / A beginning / A mindset.” Do not suggest this tee has a chest pocket unless the actual product confirms it.",
      },
      tiktok: {
        caption:
          "Why Hungry Pockets? The origin is a chest pocket. The hunger is for growth. Streetwear, not food.",
        hashtags:
          "#HungryPockets #StreetwearStory #AlwaysStarving #BrandMindset",
        cta: "What are you hungry to learn next? Discover the collection at hungrypockets.eu.",
        notes:
          "Open with “Streetwear, not food.” Then pair short origin text with real lifestyle footage and the supplied product image. Keep history separate from present product details; no pocket close-up on an unverified garment.",
      },
    },
  },
  {
    id: "join-the-circle",
    title: "Your kind of hustle",
    headline: "ROOM FOR YOUR DRIVE",
    campaign: "Always Starving",
    theme: "Community",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/women.webp",
    tone: "lavender",
    variants: {
      instagram: {
        caption:
          "Your hustle does not have to look like anyone else’s. Learning a trick, making a beat, starting again: there is room for your version of drive. Tell us what keeps you moving. We want to hear the story behind the fit.",
        hashtags:
          "#HungryPockets #AlwaysStarving #StreetwearCommunity #CreativeDrive #PersonalStyle",
        cta: "Share your current project in the comments, or tag Hungry Pockets in your own fit post. Discover the collection at hungrypockets.eu.",
        notes:
          "Ask a willing participant to show a real activity and their outfit, then finish with the question “What keeps you moving?” Obtain permission for anyone featured. Do not use invented testimonials or imply that tags guarantee a repost.",
      },
      tiktok: {
        caption:
          "Not every hustle looks the same. What are you learning, making, or trying again right now?",
        hashtags:
          "#HungryPockets #StreetwearCommunity #KeepCreating #AlwaysStarving",
        cta: "Add your version in the comments. Discover the collection at hungrypockets.eu.",
        notes:
          "Film one person with consent in three shots: their activity, their outfit, and a pause facing camera. Use their own words only if they approve them; a text question works without a spoken endorsement.",
      },
    },
  },
  {
    id: "weekend-rotation",
    title: "Weekend rotation",
    headline: "MAKE IT YOUR WEEKEND",
    campaign: "The everyday edit",
    theme: "Outfit inspiration",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/cap.png",
    tone: "yellow",
    variants: {
      instagram: {
        caption:
          "No fixed itinerary. Just a fit that feels like your time. Start with the Hungry Pockets cap, build around the oversized faded tee, and choose the layer that suits your plans. Your weekend, your rotation.",
        hashtags:
          "#HungryPockets #WeekendStyle #StreetwearOutfit #CapStyle #OutfitRotation",
        cta: "Save this for the next time you ask, “What am I wearing?” Discover the collection at hungrypockets.eu.",
        notes:
          "Shoot an outfit flat lay, a cap close-up, and a full-body reveal with the actual pieces. A windbreaker can be an optional layer. If working only with supplied photos, make a clearly text-led image-motion edit rather than fabricating modeled footage.",
      },
      tiktok: {
        caption:
          "Weekend outfit formula: cap, oversized faded tee, your choice of layer. Where are you taking it?",
        hashtags:
          "#HungryPockets #WeekendFit #OversizedTee #CapStyle #Streetwear",
        cta: "Comment your first weekend stop. Discover the collection at hungrypockets.eu.",
        notes:
          "Record a quick get-ready sequence: tee on hanger, cap in hand, complete look. Label the three styling steps and finish with a walking shot. No travel plans, campaign dates, or finished video are implied by this template.",
      },
    },
  },
  {
    id: "street-verdict",
    title: "The Street Verdict",
    headline: "“HEAVIEST COTTON I'VE WORN IN YEARS.”",
    eyebrow: "CUSTOMER VERDICT · 5.0 ★",
    supportingCopy: "Direct from the streets. No influencers, no paid reviews — just real everyday wear tested against the city grind.",
    cta: "Read Verified Reviews · hungrypockets.eu",
    badge: "5.0 RATED",
    campaign: "Community Proof",
    theme: "Customer Reviews",
    format: "Image",
    platforms: ["instagram", "tiktok"],
    image: "/brand/men.webp",
    tone: "lavender",
    layout: "quote-manifesto",
    aspectRatio: "portrait",
    textAlign: "left",
    headlineFontSize: "large",
    headlineUppercase: true,
    logoSize: "medium",
    logoPosition: "top-left",
    contentPadding: "normal",
    variants: {
      instagram: {
        caption:
          "“Heaviest cotton I've worn in years. Collar stays flat after 20 washes.” That's the feedback from our latest drop. When we say heavyweight 280gsm, we mean built to withstand the concrete.",
        hashtags: "#HungryPockets #StreetwearCommunity #VerifiedReview #HeavyweightCotton #StreetwearFit",
        cta: "Tap link in bio to read what the community says about the drop. hungrypockets.eu.",
        notes: "Pair the quote with candid photo of the garment in use. Highlight fabric texture.",
      },
      tiktok: {
        caption:
          "The reviews are in: 280gsm heavyweight cotton doesn't lie. What's the most important detail in your streetwear rotation?",
        hashtags: "#HungryPockets #StreetwearReview #FitCheck #OversizedTee",
        cta: "Drop your take in the comments. Discover more at hungrypockets.eu.",
        notes: "Use quick zoom-ins on the seams and collar. Finish with quote graphic overlay.",
      },
    },
  },
  {
    id: "drop-midnight-oil",
    title: "Midnight Oil Drop",
    headline: "DROP 04 // MIDNIGHT OIL",
    eyebrow: "LIMITED RUN · 150 PIECES",
    supportingCopy: "Architectural seams. Oversized drop-shoulder profile. Screen-printed chest pocket with raw edge hems.",
    cta: "Set Reminder · Dropping Friday 18:00",
    badge: "LIMITED DROP",
    campaign: "Limited Drops",
    theme: "Product Launch",
    format: "Image",
    platforms: ["instagram", "tiktok"],
    image: "/brand/oversized.png",
    tone: "mint",
    layout: "bold-editorial",
    aspectRatio: "square",
    textAlign: "left",
    headlineFontSize: "hero",
    headlineUppercase: true,
    logoSize: "large",
    logoPosition: "top-left",
    contentPadding: "compact",
    variants: {
      instagram: {
        caption:
          "DROP 04: MIDNIGHT OIL. Strictly limited to 150 pieces worldwide. Featuring bespoke chest pocket architecture, washed charcoal finish, and heavy ribbed collar.",
        hashtags: "#HungryPockets #Drop04 #MidnightOil #LimitedStreetwear #ExclusiveDrop",
        cta: "Turn post notifications ON. Drop goes live Friday at 18:00 CET at hungrypockets.eu.",
        notes: "High contrast studio lighting. Showcase front and back print details.",
      },
      tiktok: {
        caption:
          "150 pieces. Once they're gone, they don't restock. Midnight Oil drops this Friday.",
        hashtags: "#HungryPockets #NewDrop #StreetwearDrop #LimitedEdition",
        cta: "Hit the reminder button on our bio at hungrypockets.eu.",
        notes: "Fast cuts between close-up embroidery and full-body model turn.",
      },
    },
  },
  {
    id: "crafted-in-porto",
    title: "Crafted in Porto",
    headline: "280GSM ORGANIC RAW COTTON",
    eyebrow: "ATELIER NOTES · ORIGIN",
    supportingCopy: "Every stitch is calibrated for durability. Milled, dyed, and tailored in Northern Portugal under fair artisan standards.",
    cta: "Discover the Craft · hungrypockets.eu",
    badge: "ETHICAL CRAFT",
    campaign: "Always Starving",
    theme: "Behind the Scenes",
    format: "Image",
    platforms: ["instagram", "tiktok"],
    image: "/brand/women.webp",
    tone: "peach",
    layout: "split-card",
    aspectRatio: "portrait",
    textAlign: "left",
    headlineFontSize: "medium",
    headlineUppercase: true,
    logoSize: "medium",
    logoPosition: "top-right",
    contentPadding: "normal",
    variants: {
      instagram: {
        caption:
          "We spent 8 months sourcing the right fabric mill in Porto. The result? 280gsm organic jersey that drapes with weight without feeling stiff. Streetwear with zero shortcuts.",
        hashtags: "#HungryPockets #MadeInPortugal #EthicalStreetwear #HeavyweightTee #BehindTheDesign",
        cta: "Explore the fabric story in our latest manifesto entry. hungrypockets.eu.",
        notes: "Warm atelier lighting or macro shots of woven cotton grain.",
      },
      tiktok: {
        caption:
          "Ever wonder what makes a 280gsm tee actually feel high-end? Come behind the scenes with us in Porto.",
        hashtags: "#HungryPockets #BehindTheScenes #FashionProduction #StreetwearBrand",
        cta: "Check bio link for the full studio breakdown at hungrypockets.eu.",
        notes: "B-roll of fabric cutting and sewing machine close-ups.",
      },
    },
  },
  {
    id: "minimalist-matrix",
    title: "The Minimalist Matrix",
    headline: "LESS NOISE. MORE PRESENCE.",
    eyebrow: "STYLE CODE 01",
    supportingCopy: "Three rules for the modern uniform: tonal monochrome layering, relaxed proportions, and single-point brand embroidery.",
    cta: "Shop the Capsule · hungrypockets.eu",
    badge: "STYLE GUIDE",
    campaign: "The everyday edit",
    theme: "Style Matrix",
    format: "Image",
    platforms: ["instagram", "tiktok"],
    image: "/brand/beanie.png",
    tone: "lavender",
    layout: "framed-minimal",
    aspectRatio: "square",
    textAlign: "center",
    headlineFontSize: "medium",
    headlineUppercase: true,
    logoSize: "medium",
    logoPosition: "top-center",
    contentPadding: "spacious",
    variants: {
      instagram: {
        caption:
          "The Minimalist Matrix: How to style the Hungry Pockets essentials for any season. Start with a solid foundation, let the cut speak for itself, and skip excessive logos.",
        hashtags: "#HungryPockets #MinimalStreetwear #MonochromeFit #StyleGuide #StreetwearBasics",
        cta: "Save this styling guide for your daily wardrobe rotation. hungrypockets.eu.",
        notes: "Grid or clean isolated flat lay with plenty of negative space.",
      },
      tiktok: {
        caption:
          "How to make basic streetwear look 10x more intentional in 3 steps.",
        hashtags: "#HungryPockets #StyleTips #MensFashion #OutfitInspo",
        cta: "Save this video for later at hungrypockets.eu.",
        notes: "Step-by-step outfit builder with on-screen text overlays.",
      },
    },
  },
  {
    id: "pocket-pass-vip",
    title: "Pocket Pass Exclusive",
    headline: "SECRET ACCESS FOR THE INNER CIRCLE",
    eyebrow: "VIP CHANNEL ONLY",
    supportingCopy: "Early release access, archived prototype sample sales, and private community discord invitations.",
    cta: "Join The Pass · Free Sign Up",
    badge: "INNER CIRCLE",
    campaign: "Inner Circle",
    theme: "Community Exclusives",
    format: "Image",
    platforms: ["instagram", "tiktok"],
    image: "/brand/windbreaker.png",
    tone: "mint",
    layout: "cinematic-bleed",
    aspectRatio: "portrait",
    textAlign: "left",
    headlineFontSize: "hero",
    headlineUppercase: true,
    logoSize: "large",
    logoPosition: "top-left",
    contentPadding: "compact",
    variants: {
      instagram: {
        caption:
          "Subscribers get 24-hour headstart access to every new drop before it touches public socials. Don't take Ls on your size. Link in bio.",
        hashtags: "#HungryPockets #InnerCircle #VIPAccess #StreetwearCulture #DropAlert",
        cta: "Tap link in bio to secure your Pocket Pass at hungrypockets.eu.",
        notes: "Moody, cinematic night photography with neon or street lamp highlights.",
      },
      tiktok: {
        caption:
          "How to get access to drops before they sell out instantly. Link in bio.",
        hashtags: "#HungryPockets #StreetwearHacks #DropReminder #Exclusive",
        cta: "Join the free inner circle today at hungrypockets.eu.",
        notes: "Quick screen-recording showing secret drop notification arriving on phone.",
      },
    },
  },
  {
    id: "never-sit-comfortable",
    title: "The Manifesto Creed",
    headline: "COMFORT IS THE ENEMY OF HUNGER",
    eyebrow: "THE HUNGRY POCKETS CREED",
    supportingCopy: "Always Starving Since 2014. Built for the creators, athletes, night-crawlers, and dreamers who refuse to settle for ordinary.",
    cta: "Read The Manifesto · hungrypockets.eu",
    badge: "MANIFESTO",
    campaign: "Always Starving",
    theme: "Brand Philosophy",
    format: "Image",
    platforms: ["instagram", "tiktok"],
    image: "/brand/cap.png",
    tone: "yellow",
    layout: "quote-manifesto",
    aspectRatio: "portrait",
    textAlign: "left",
    headlineFontSize: "display",
    headlineUppercase: true,
    logoSize: "xlarge",
    logoPosition: "top-left",
    contentPadding: "spacious",
    variants: {
      instagram: {
        caption:
          "Always Starving isn't a slogan. It's a refusal to stop evolving. Ten years in the streets, ten years of independent hustle. Where does your hunger take you today?",
        hashtags: "#HungryPockets #AlwaysStarving #StreetwearPhilosophy #IndieBrand #Manifesto",
        cta: "Join the movement at hungrypockets.eu.",
        notes: "Black and white portrait photography with red typographic accent.",
      },
      tiktok: {
        caption:
          "Why we put a chest pocket on every piece since 2014. The story of Always Starving.",
        hashtags: "#HungryPockets #BrandOrigin #FounderStory #StreetwearHistory",
        cta: "Share your hustle story in the comments at hungrypockets.eu.",
        notes: "Voiceover over vintage and urban street footage.",
      },
    },
  },
  {
    id: "whats-in-your-pocket",
    title: "What's in Your Pocket?",
    headline: "EMPTY YOUR POCKETS // EPISODE 01",
    eyebrow: "STREET INTERVIEW REEL",
    supportingCopy: "We hit the streets of downtown asking creatives, skaters, and photographers what they never leave home without.",
    cta: "Watch Full Episode · Tap Bio",
    badge: "TRENDING REEL",
    campaign: "Street Stories",
    theme: "Interactive Culture",
    format: "Video",
    platforms: ["instagram", "tiktok"],
    image: "/brand/men.webp",
    tone: "peach",
    layout: "bold-editorial",
    aspectRatio: "vertical",
    textAlign: "left",
    headlineFontSize: "hero",
    headlineUppercase: true,
    logoSize: "large",
    logoPosition: "top-left",
    contentPadding: "normal",
    variants: {
      instagram: {
        caption:
          "What’s the one item you never leave the house without? We stopped 10 people in downtown to check their pockets. Watch till the end for the wildest find.",
        hashtags: "#HungryPockets #WhatsInYourPocket #StreetInterview #StreetStyle #EDC",
        cta: "Tell us what's in your pocket right now in the comments. hungrypockets.eu.",
        notes: "Vertical 9:16 layout with loud audio hook and bold yellow caption text.",
      },
      tiktok: {
        caption:
          "Empty your pockets episode 1: SOHO edition. The last guy surprised us all.",
        hashtags: "#HungryPockets #StreetInterview #PublicInterview #EDCPocketDump",
        cta: "Follow for episode 2 dropping next week at hungrypockets.eu.",
        notes: "Fast 15-second cut with high energy intro and sudden punchline.",
      },
    },
  },
  {
    id: "concrete-autumn-lookbook",
    title: "Autumn on Concrete Lookbook",
    headline: "AUTUMN ON CONCRETE // LOOKBOOK",
    eyebrow: "SEASONAL EDIT · 4 LOOKS",
    supportingCopy: "Heavyweight outerwear, faded wash layers, and water-repellent technical caps built for the transitional cold.",
    cta: "Swipe to Explore All 4 Fits",
    badge: "LOOKBOOK",
    campaign: "The everyday edit",
    theme: "Lookbook",
    format: "Carousel",
    platforms: ["instagram", "tiktok"],
    image: "/brand/windbreaker.png",
    tone: "lavender",
    layout: "bold-editorial",
    aspectRatio: "portrait",
    textAlign: "left",
    headlineFontSize: "large",
    headlineUppercase: true,
    logoSize: "medium",
    logoPosition: "top-left",
    contentPadding: "normal",
    slides: [
      {
        id: "slide-1",
        headline: "AUTUMN ON CONCRETE",
        supportingCopy: "Look 01: Unisex Technical Windbreaker paired with the 5-Panel Cap.",
        image: "/brand/windbreaker.png",
        badge: "LOOK 01",
        cta: "Swipe for Look 02",
      },
      {
        id: "slide-2",
        headline: "THE HEAVYWEIGHT TEE",
        supportingCopy: "Look 02: 280gsm Faded Black Oversized Tee with chest pocket detail.",
        image: "/brand/black-shirt.png",
        badge: "LOOK 02",
        cta: "Swipe for Look 03",
      },
      {
        id: "slide-3",
        headline: "TRANSITIONAL BEANIE",
        supportingCopy: "Look 03: 100% Cuffed Ribbed Beanie in charcoal heather.",
        image: "/brand/beanie.png",
        badge: "LOOK 03",
        cta: "Swipe for Look 04",
      },
      {
        id: "slide-4",
        headline: "COMPLETE YOUR ROTATION",
        supportingCopy: "Every look is now available at hungrypockets.eu with free EU shipping.",
        image: "/brand/men.png",
        badge: "SHOP NOW",
        cta: "Explore the Collection",
      },
    ],
    variants: {
      instagram: {
        caption:
          "Autumn on Concrete: A 4-look capsule designed to transition from brisk mornings to midnight sessions. Swipe through to see the layers in motion.",
        hashtags: "#HungryPockets #AutumnLookbook #StreetwearLookbook #FallFits #LayeringSeason",
        cta: "Which look fits your rotation? Comment 1, 2, 3 or 4 below at hungrypockets.eu.",
        notes: "4-slide carousel with seamless panoramic flow between slides.",
      },
      tiktok: {
        caption:
          "4 streetwear fits for autumn. Which one are you wearing first?",
        hashtags: "#HungryPockets #Lookbook #OutfitIdeas #StreetwearFashion",
        cta: "Tap link in bio to shop the drop at hungrypockets.eu.",
        notes: "Fast 2-second slide transitions with dynamic sound effects.",
      },
    },
  },
];
