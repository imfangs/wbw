/**
 * WBW 文章清单 —— 单一真相源
 * build-all.ts 用它排队,build-sidebar.ts 用它分组
 * 加/删文章:改这里,重跑 build-all + rebuild:sidebar
 */

export type Topic =
  | 'space-musk'
  | 'ai-tech'
  | 'scale-time'
  | 'psychology'
  | 'society-culture'
  | 'politics'
  | 'travel-place'
  | 'misc'

export interface Article {
  slug: string           // posts/<slug>.md
  url: string            // 权威 WBW URL(覆盖 urlToSlug 猜测)
  date: string           // YYYY-MM-DD
  title: string          // 英文原标题(scrape 挂了时的 fallback)
  topic: Topic
  skip?: 'dup' | 'meta'
}

export const TOPIC_LABEL: Record<Topic, string> = {
  'space-musk': '马斯克与太空',
  'ai-tech': 'AI 与科技',
  'scale-time': '时间与尺度',
  'psychology': '心理与选择',
  'society-culture': '社会与文化',
  'politics': '政治',
  'travel-place': '旅行与国家',
  'misc': '其他',
}

// 展示顺序(sidebar)
export const TOPIC_ORDER: Topic[] = [
  'space-musk',
  'ai-tech',
  'scale-time',
  'psychology',
  'society-culture',
  'politics',
  'travel-place',
  'misc',
]

export const ARTICLES: Article[] = [
  // 2025
  { slug: 'bhutan', url: 'https://waitbutwhy.com/2025/11/bhutan.html', date: '2025-11-01', title: 'The sights and sounds of Bhutan', topic: 'travel-place' },
  { slug: 'toddler', url: 'https://waitbutwhy.com/2025/10/toddler.html', date: '2025-10-01', title: 'Tales from Toddlerhood', topic: 'misc' },

  // 2024
  { slug: 'vision-pro', url: 'https://waitbutwhy.com/2024/02/vision-pro.html', date: '2024-02-01', title: 'All My Thoughts After 40 Hours in the Vision Pro', topic: 'ai-tech' },

  // 2023
  { slug: 'baby', url: 'https://waitbutwhy.com/2023/05/baby.html', date: '2023-05-01', title: '10 Thoughts from the Fourth Trimester', topic: 'misc' },
  { slug: 'last-six-years', url: 'https://waitbutwhy.com/2023/02/last-six-years.html', date: '2023-02-01', title: 'A Short History of My Last Six Years', topic: 'misc' },

  // 2021
  { slug: 'mailbag-2', url: 'https://waitbutwhy.com/2021/04/mailbag-2.html', date: '2021-04-01', title: 'Mailbag #2', topic: 'misc' },

  // 2020
  { slug: 'debate2020', url: 'https://waitbutwhy.com/2020/09/debate2020.html', date: '2020-09-01', title: 'The Trump-Biden Debate', topic: 'politics' },
  { slug: 'universe', url: 'https://waitbutwhy.com/2020/09/universe.html', date: '2020-09-01', title: 'The Big and the Small', topic: 'scale-time' },
  // my-morning: 网关审核后返回空 content,先跳过,后续人肉重翻
  { slug: 'my-morning', url: 'https://waitbutwhy.com/2020/03/my-morning.html', date: '2020-03-01', title: "You Won't Believe My Morning", topic: 'misc', skip: 'meta' },
  { slug: 'its-2020-and-youre-in-the-future', url: 'https://waitbutwhy.com/2020/01/its-2020-and-youre-in-the-future.html', date: '2020-01-01', title: "It's 2020 and you're in the future", topic: 'society-culture' },

  // 2018
  { slug: 'picking-career', url: 'https://waitbutwhy.com/2018/04/picking-career.html', date: '2018-04-01', title: 'How to Pick a Career (That Actually Fits You)', topic: 'psychology' },

  // 2017
  { slug: 'neuralink', url: 'https://waitbutwhy.com/2017/04/neuralink.html', date: '2017-04-01', title: "Neuralink and the Brain's Magical Future", topic: 'ai-tech' },

  // 2016
  { slug: '100-blocks-day', url: 'https://waitbutwhy.com/2016/10/100-blocks-day.html', date: '2016-10-01', title: '100 Blocks a Day', topic: 'psychology' },
  { slug: 'second-presidential-debate', url: 'https://waitbutwhy.com/2016/10/second-presidential-debate.html', date: '2016-10-01', title: 'The Second Presidential Debate', topic: 'politics' },
  { slug: 'spacexs-big-fking-rocket-the-full-story', url: 'https://waitbutwhy.com/2016/09/spacexs-big-fking-rocket-the-full-story.html', date: '2016-09-01', title: "SpaceX's Big Fucking Rocket – The Full Story", topic: 'space-musk' },
  { slug: 'marriage-decision', url: 'https://waitbutwhy.com/2016/09/marriage-decision.html', date: '2016-09-01', title: 'The Marriage Decision: Everything Forever or Nothing', topic: 'psychology' },
  { slug: 'wait-hi-full-report', url: 'https://waitbutwhy.com/2016/08/wait-hi-full-report.html', date: '2016-08-01', title: 'Wait But Hi – Full Report', topic: 'misc', skip: 'meta' },
  { slug: 'clueyness-a-weird-kind-of-sad', url: 'https://waitbutwhy.com/2016/05/clueyness-a-weird-kind-of-sad.html', date: '2016-05-01', title: 'Clueyness: A Weird Kind of Sad', topic: 'psychology' },
  { slug: 'mailbag-1', url: 'https://waitbutwhy.com/2016/05/mailbag-1.html', date: '2016-05-01', title: 'Mailbag #1', topic: 'misc' },
  { slug: 'cryonics', url: 'https://waitbutwhy.com/2016/03/cryonics.html', date: '2016-03-01', title: 'Why Cryonics Makes Sense', topic: 'ai-tech' },
  { slug: 'my-ted-talk', url: 'https://waitbutwhy.com/2016/03/my-ted-talk.html', date: '2016-03-01', title: 'My TED Talk', topic: 'misc', skip: 'meta' },
  { slug: 'long-email-delay', url: 'https://waitbutwhy.com/2016/03/long-email-delay.html', date: '2016-03-01', title: 'How I Handle Long Email Delays', topic: 'psychology' },
  { slug: 'sound', url: 'https://waitbutwhy.com/2016/03/sound.html', date: '2016-03-01', title: 'Everything You Should Know About Sound', topic: 'scale-time' },
  { slug: 'doing-a-ted-talk-the-full-story', url: 'https://waitbutwhy.com/2016/03/doing-a-ted-talk-the-full-story.html', date: '2016-03-01', title: 'Doing a TED Talk: The Full Story', topic: 'misc' },
  { slug: 'horizontal-history', url: 'https://waitbutwhy.com/2016/01/horizontal-history.html', date: '2016-01-01', title: 'Horizontal History', topic: 'scale-time' },

  // 2015
  { slug: 'the-tail-end', url: 'https://waitbutwhy.com/2015/12/the-tail-end.html', date: '2015-12-01', title: 'The Tail End', topic: 'scale-time' },
  { slug: 'the-cook-and-the-chef-musks-secret-sauce', url: 'https://waitbutwhy.com/2015/11/the-cook-and-the-chef-musks-secret-sauce.html', date: '2015-11-01', title: "The Cook and the Chef: Musk's Secret Sauce", topic: 'space-musk' },
  { slug: 'how-and-why-spacex-will-colonize-mars', url: 'https://waitbutwhy.com/2015/08/how-and-why-spacex-will-colonize-mars.html', date: '2015-08-16', title: 'How (and Why) SpaceX Will Colonize Mars', topic: 'space-musk' },
  { slug: 'why-im-always-late', url: 'https://waitbutwhy.com/2015/07/why-im-always-late.html', date: '2015-07-01', title: "Why I'm Always Late", topic: 'psychology' },
  { slug: 'how-tesla-will-change-your-life', url: 'https://waitbutwhy.com/2015/06/how-tesla-will-change-your-life.html', date: '2015-06-01', title: 'How Tesla Will Change The World', topic: 'space-musk' },
  { slug: 'hyperloop', url: 'https://waitbutwhy.com/2015/06/hyperloop.html', date: '2015-06-01', title: 'The Deal With the Hyperloop', topic: 'space-musk' },
  { slug: 'elon-musk-introduction', url: 'https://waitbutwhy.com/2015/05/elon-musk-introduction.html', date: '2015-05-01', title: 'Elon Musk Series: Introduction', topic: 'space-musk', skip: 'dup' },
  { slug: 'elon-musk-the-worlds-raddest-man', url: 'https://waitbutwhy.com/2015/05/elon-musk-the-worlds-raddest-man.html', date: '2015-05-07', title: 'Elon Musk Series: Introduction', topic: 'space-musk' },
  { slug: 'procrastination-matrix', url: 'https://waitbutwhy.com/2015/03/procrastination-matrix.html', date: '2015-03-01', title: 'The Procrastination Matrix', topic: 'psychology' },
  { slug: '7-3-billion-people-one-building', url: 'https://waitbutwhy.com/2015/03/7-3-billion-people-one-building.html', date: '2015-03-01', title: '7.3 Billion People, One Building', topic: 'scale-time' },
  { slug: 'american-presidents-johnson-mckinley', url: 'https://waitbutwhy.com/2015/02/american-presidents-johnson-mckinley.html', date: '2015-02-01', title: 'The American Presidents—Johnson to McKinley', topic: 'society-culture' },
  { slug: 'artificial-intelligence-revolution-2', url: 'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-2.html', date: '2015-01-27', title: 'The AI Revolution: Our Immortality or Extinction', topic: 'ai-tech' },
  { slug: 'artificial-intelligence-revolution-1', url: 'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html', date: '2015-01-22', title: 'The AI Revolution: The Road to Superintelligence', topic: 'ai-tech' },

  // 2014
  { slug: 'popular-posts-2014', url: 'https://waitbutwhy.com/2014/12/popular-posts-2014.html', date: '2014-12-01', title: 'Our Most Popular Posts of 2014', topic: 'misc', skip: 'meta' },
  { slug: 'the-teen-years-9-cringe-inducing-realizations', url: 'https://waitbutwhy.com/2014/12/the-teen-years-9-cringe-inducing-realizations.html', date: '2014-12-01', title: 'The Teen Years: 9 Cringe-Inducing Realizations', topic: 'society-culture' },
  { slug: 'what-makes-you-you', url: 'https://waitbutwhy.com/2014/12/what-makes-you-you.html', date: '2014-12-01', title: 'What Makes You You?', topic: 'psychology' },
  { slug: '10-types-odd-friendships-youre-probably-part', url: 'https://waitbutwhy.com/2014/12/10-types-odd-friendships-youre-probably-part.html', date: '2014-12-01', title: "10 Types of Odd Friendships You're Probably Part Of", topic: 'society-culture' },
  { slug: '1000000-grahams-number', url: 'https://waitbutwhy.com/2014/11/1000000-grahams-number.html', date: '2014-11-01', title: "From 1,000,000 to Graham's Number", topic: 'scale-time' },
  { slug: 'from-1-to-1000000', url: 'https://waitbutwhy.com/2014/11/from-1-to-1000000.html', date: '2014-11-01', title: 'From 1 to 1,000,000', topic: 'scale-time' },
  { slug: 'dark-secrets-bird-world', url: 'https://waitbutwhy.com/2014/10/dark-secrets-bird-world.html', date: '2014-10-01', title: 'The Dark Secrets of the Bird World', topic: 'misc' },
  { slug: 'religion-for-the-nonreligious', url: 'https://waitbutwhy.com/2014/10/religion-for-the-nonreligious.html', date: '2014-10-01', title: 'Religion for the Nonreligious', topic: 'society-culture' },
  { slug: 'how-religion-got-in-the-way', url: 'https://waitbutwhy.com/2014/10/how-religion-got-in-the-way.html', date: '2014-10-01', title: 'How Religion Got in the Way', topic: 'society-culture' },
  { slug: 'odd-things-odd-places-7-travel-posts', url: 'https://waitbutwhy.com/2014/09/odd-things-odd-places-7-travel-posts.html', date: '2014-09-01', title: 'Odd Things in Odd Places – All 7 Travel Posts', topic: 'travel-place', skip: 'meta' },
  { slug: 'genie-question', url: 'https://waitbutwhy.com/2014/09/genie-question.html', date: '2014-09-01', title: 'The Genie Question', topic: 'psychology' },
  { slug: 'but-what-about-greenland', url: 'https://waitbutwhy.com/2014/09/but-what-about-greenland.html', date: '2014-09-01', title: 'But What About Greenland?', topic: 'travel-place' },
  { slug: 'muhammad-isis-iraqs-full-story', url: 'https://waitbutwhy.com/2014/09/muhammad-isis-iraqs-full-story.html', date: '2014-09-01', title: "From Muhammad to ISIS: Iraq's Full Story", topic: 'society-culture' },
  { slug: '19-things-learned-nigeria', url: 'https://waitbutwhy.com/2014/08/19-things-learned-nigeria.html', date: '2014-08-01', title: '19 Things I Learned in Nigeria', topic: 'travel-place' },
  { slug: 'japan-and-how-i-failed-to-figure-it-out', url: 'https://waitbutwhy.com/2014/07/japan-and-how-i-failed-to-figure-it-out.html', date: '2014-07-01', title: 'Japan, and How I Failed to Figure it Out', topic: 'travel-place' },
  { slug: 'russia-what-you-didnt-know', url: 'https://waitbutwhy.com/2014/07/russia-what-you-didnt-know.html', date: '2014-07-01', title: "Russia: What You Didn't Know You Don't Know", topic: 'travel-place' },
  { slug: 'odd-things-odd-places-intro', url: 'https://waitbutwhy.com/2014/07/odd-things-odd-places-intro.html', date: '2014-07-01', title: 'Odd Things in Odd Places: Intro', topic: 'travel-place' },
  { slug: 'taming-mammoth-let-peoples-opinions-run-life', url: 'https://waitbutwhy.com/2014/06/taming-mammoth-let-peoples-opinions-run-life.html', date: '2014-06-01', title: "Taming the Mammoth: Why You Should Stop Caring What Other People Think", topic: 'psychology' },
  { slug: 'secretly-hate-bars', url: 'https://waitbutwhy.com/2014/05/secretly-hate-bars.html', date: '2014-05-01', title: 'Why You Secretly Hate Cool Bars', topic: 'society-culture' },
  { slug: 'fermi-paradox', url: 'https://waitbutwhy.com/2014/05/fermi-paradox.html', date: '2014-05-21', title: 'The Fermi Paradox', topic: 'scale-time' },
  { slug: 'absurdly-famous-people-probably-dont-know-enough', url: 'https://waitbutwhy.com/2014/05/absurdly-famous-people-probably-dont-know-enough.html', date: '2014-05-01', title: "10 Absurdly Famous People You Probably Don't Know Enough About", topic: 'society-culture' },
  { slug: 'life-weeks', url: 'https://waitbutwhy.com/2014/05/life-weeks.html', date: '2014-05-01', title: 'Your Life in Weeks', topic: 'scale-time' },
  { slug: 'traveling-third-world-great-also-sucks', url: 'https://waitbutwhy.com/2014/04/traveling-third-world-great-also-sucks.html', date: '2014-04-01', title: 'Traveling To The Third World Is Great And Also It Sucks', topic: 'travel-place' },
  { slug: 'everything-dont-know-tipping', url: 'https://waitbutwhy.com/2014/04/everything-dont-know-tipping.html', date: '2014-04-01', title: "Everything You Don't Know About Tipping", topic: 'society-culture' },
  { slug: 'combined-wealth-world', url: 'https://waitbutwhy.com/2014/03/combined-wealth-world.html', date: '2014-03-01', title: 'What Could You Buy With $241 Trillion?', topic: 'scale-time' },
  { slug: 'sports-fans-sports-fans', url: 'https://waitbutwhy.com/2014/03/sports-fans-sports-fans.html', date: '2014-03-01', title: 'Why Sports Fans are Sports Fans', topic: 'society-culture' },
  { slug: 'why-is-my-laptop-on', url: 'https://waitbutwhy.com/2014/03/why-is-my-laptop-on.html', date: '2014-03-01', title: 'Why is My Laptop On?', topic: 'ai-tech' },
  { slug: 'american-presidents-washington-lincoln', url: 'https://waitbutwhy.com/2014/02/american-presidents-washington-lincoln.html', date: '2014-02-01', title: 'The American Presidents—Washington to Lincoln', topic: 'society-culture' },
  { slug: 'pick-life-partner-part-2', url: 'https://waitbutwhy.com/2014/02/pick-life-partner-part-2.html', date: '2014-02-01', title: 'How to Pick Your Life Partner – Part 2', topic: 'psychology' },
  { slug: 'pick-life-partner', url: 'https://waitbutwhy.com/2014/02/pick-life-partner.html', date: '2014-02-01', title: 'How to Pick Your Life Partner – Part 1', topic: 'psychology' },
  { slug: 'why-bugs-ruin-everything', url: 'https://waitbutwhy.com/2014/02/why-bugs-ruin-everything.html', date: '2014-02-01', title: 'Why Bugs Ruin Everything', topic: 'misc' },
  { slug: 'your-family-past-present-and-future', url: 'https://waitbutwhy.com/2014/01/your-family-past-present-and-future.html', date: '2014-01-01', title: 'Your Family: Past, Present, and Future', topic: 'scale-time' },
  { slug: 'the-great-perils-of-social-interaction', url: 'https://waitbutwhy.com/2014/01/the-great-perils-of-social-interaction.html', date: '2014-01-01', title: 'The Great Perils of Social Interaction', topic: 'psychology' },

  // 2013
  { slug: 'wait-but-why-holiday-update', url: 'https://waitbutwhy.com/2013/12/wait-but-why-holiday-update.html', date: '2013-12-01', title: 'Wait But Why Holiday Post', topic: 'misc', skip: 'meta' },
  { slug: 'your-ancestor-is-jellyfish', url: 'https://waitbutwhy.com/2013/12/your-ancestor-is-jellyfish.html', date: '2013-12-01', title: 'Meet Your Ancestors (All of Them)', topic: 'scale-time' },
  { slug: 'how-to-name-baby', url: 'https://waitbutwhy.com/2013/12/how-to-name-baby.html', date: '2013-12-01', title: 'How to Name a Baby', topic: 'society-culture' },
  { slug: '11-awkward-things-about-email', url: 'https://waitbutwhy.com/2013/12/11-awkward-things-about-email.html', date: '2013-12-01', title: '11 Awkward Things About Email', topic: 'psychology' },
  { slug: 'life-is-picture-but-you-live-in-pixel', url: 'https://waitbutwhy.com/2013/11/life-is-picture-but-you-live-in-pixel.html', date: '2013-11-01', title: 'Life is a Picture, But You Live in a Pixel', topic: 'psychology' },
  { slug: '4-mind-blowing-things-about-stars', url: 'https://waitbutwhy.com/2013/11/4-mind-blowing-things-about-stars.html', date: '2013-11-01', title: '4 Mind-Blowing Things About Stars', topic: 'scale-time' },
  { slug: 'how-to-beat-procrastination', url: 'https://waitbutwhy.com/2013/11/how-to-beat-procrastination.html', date: '2013-11-01', title: 'How to Beat Procrastination', topic: 'psychology' },
  { slug: 'why-procrastinators-procrastinate', url: 'https://waitbutwhy.com/2013/10/why-procrastinators-procrastinate.html', date: '2013-10-30', title: 'Why Procrastinators Procrastinate', topic: 'psychology' },
  { slug: 'the-primate-awards', url: 'https://waitbutwhy.com/2013/10/the-primate-awards.html', date: '2013-10-01', title: 'The Primate Awards', topic: 'misc' },
  { slug: 'the-battle-to-lose-independent-vote', url: 'https://waitbutwhy.com/2013/10/the-battle-to-lose-independent-vote.html', date: '2013-10-01', title: 'The Battle to Lose the Independent Vote', topic: 'politics' },
  { slug: '10-types-of-30-year-old-single-guys', url: 'https://waitbutwhy.com/2013/10/10-types-of-30-year-old-single-guys.html', date: '2013-10-01', title: '10 Types of 30-Year-Old Single Guys', topic: 'society-culture' },
  { slug: 'what-does-quadrillion-sour-patch-kids', url: 'https://waitbutwhy.com/2013/10/what-does-quadrillion-sour-patch-kids.html', date: '2013-10-01', title: 'What Does a Quadrillion Sour Patch Kids Look Like?', topic: 'scale-time' },
  { slug: '20-things-i-learned-while-i-was-in', url: 'https://waitbutwhy.com/2013/09/20-things-i-learned-while-i-was-in.html', date: '2013-09-01', title: '20 Things I Learned While I Was in North Korea', topic: 'travel-place' },
  { slug: 'why-generation-y-yuppies-are-unhappy', url: 'https://waitbutwhy.com/2013/09/why-generation-y-yuppies-are-unhappy.html', date: '2013-09-01', title: 'Why Generation Y Yuppies Are Unhappy', topic: 'society-culture' },
  { slug: 'all-weird-toys-from-your-childhood', url: 'https://waitbutwhy.com/2013/09/all-weird-toys-from-your-childhood.html', date: '2013-09-01', title: 'All the Weird Toys From Your Childhood', topic: 'society-culture' },
  { slug: 'the-apple-game-how-good-person-are-you', url: 'https://waitbutwhy.com/2013/08/the-apple-game-how-good-person-are-you.html', date: '2013-08-01', title: 'The Apple Game: How Good a Person Are You?', topic: 'psychology' },
  { slug: '7-asinine-things-about-society', url: 'https://waitbutwhy.com/2013/08/7-asinine-things-about-society.html', date: '2013-08-01', title: '7 Asinine Things About Society', topic: 'society-culture' },
  { slug: 'putting-time-in-perspective', url: 'https://waitbutwhy.com/2013/08/putting-time-in-perspective.html', date: '2013-08-01', title: 'Putting Time In Perspective', topic: 'scale-time' },
  { slug: 'creepy-kids-in-creepy-vintage-ads', url: 'https://waitbutwhy.com/2013/08/creepy-kids-in-creepy-vintage-ads.html', date: '2013-08-01', title: 'Creepy Kids in Creepy Vintage Ads', topic: 'society-culture' },
  { slug: 'what-if-all-71-billion-people-moved-to', url: 'https://waitbutwhy.com/2013/08/what-if-all-71-billion-people-moved-to.html', date: '2013-08-01', title: 'What If All 7.1 Billion People Moved To Tunisia?', topic: 'scale-time' },
  { slug: 'the-bunny-manifesto', url: 'https://waitbutwhy.com/2013/08/the-bunny-manifesto.html', date: '2013-08-01', title: 'The Bunny Manifesto', topic: 'misc' },
  { slug: 'the-death-toll-comparison-breakdown', url: 'https://waitbutwhy.com/2013/08/the-death-toll-comparison-breakdown.html', date: '2013-08-01', title: 'The Death Toll Comparison Breakdown', topic: 'scale-time' },
  { slug: '14-shitty-sayings', url: 'https://waitbutwhy.com/2013/07/14-shitty-sayings.html', date: '2013-07-01', title: '14 Shitty Sayings', topic: 'society-culture' },
  { slug: '12-types-of-people-youll-find-in-every', url: 'https://waitbutwhy.com/2013/07/12-types-of-people-youll-find-in-every.html', date: '2013-07-01', title: "12 Types of People You'll Find in Every Hostel", topic: 'travel-place' },
  { slug: 'gods-wounded-ego', url: 'https://waitbutwhy.com/2013/07/gods-wounded-ego.html', date: '2013-07-01', title: "God's Wounded Ego", topic: 'society-culture' },
  { slug: 'medieval-people-in-bad-situations', url: 'https://waitbutwhy.com/2013/07/medieval-people-in-bad-situations.html', date: '2013-07-01', title: 'Medieval People In Bad Situations', topic: 'society-culture' },
  { slug: '7-ways-to-be-insufferable-on-facebook', url: 'https://waitbutwhy.com/2013/07/7-ways-to-be-insufferable-on-facebook.html', date: '2013-07-01', title: '7 Ways to Be Insufferable on Facebook', topic: 'society-culture' },
]

export const ARTICLE_BY_SLUG: Record<string, Article> = Object.fromEntries(
  ARTICLES.map(a => [a.slug, a])
)
