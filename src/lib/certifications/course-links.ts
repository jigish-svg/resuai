// Curated free-course links for common skills. Deliberately small and
// hand-picked (not AI-generated) — a wrong or dead link here is worse than
// no link. Anything not in this map falls back to a search query so the
// feature is never a dead end, even before the curated list grows.
const CURATED_COURSE_LINKS: Record<string, string> = {
  python: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/',
  javascript: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/',
  typescript: 'https://www.typescriptlang.org/docs/handbook/intro.html',
  react: 'https://react.dev/learn',
  'node.js': 'https://www.freecodecamp.org/learn/back-end-development-and-apis/',
  nodejs: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/',
  sql: 'https://www.freecodecamp.org/learn/relational-database/',
  'amazon web services': 'https://skillbuilder.aws/',
  aws: 'https://skillbuilder.aws/',
  azure: 'https://learn.microsoft.com/en-us/training/azure/',
  'google cloud': 'https://cloud.google.com/learn/training/free-labs',
  gcp: 'https://cloud.google.com/learn/training/free-labs',
  docker: 'https://docker-curriculum.com/',
  kubernetes: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
  git: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/#git-and-github',
  html: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
  css: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
  java: 'https://www.codecademy.com/learn/learn-java',
  'c++': 'https://www.codecademy.com/learn/learn-c-plus-plus',
  'machine learning': 'https://www.coursera.org/learn/machine-learning',
  'data analysis': 'https://www.freecodecamp.org/learn/data-analysis-with-python/',
  excel: 'https://www.coursera.org/learn/excel-essentials',
  'project management': 'https://www.coursera.org/professional-certificates/google-project-management',
  'digital marketing': 'https://skillshop.exceedlms.com/student/catalog',
};

export function getCertificationCourseLink(skill: string): { url: string; curated: boolean } {
  const key = skill.trim().toLowerCase();
  const curatedUrl = CURATED_COURSE_LINKS[key];
  if (curatedUrl) {
    return { url: curatedUrl, curated: true };
  }
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(`free certification course ${skill}`)}`,
    curated: false,
  };
}
