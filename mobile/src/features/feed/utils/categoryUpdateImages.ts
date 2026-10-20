import type { ImageSourcePropType } from 'react-native';

const developmentImages = [
  require('../../../../assets/category-updates/development/1.jpg'),
  require('../../../../assets/category-updates/development/2.jpg'),
  require('../../../../assets/category-updates/development/3.jpg'),
  require('../../../../assets/category-updates/development/4.jpg'),
  require('../../../../assets/category-updates/development/5.jpg'),
];

const categoryImages: Record<string, ImageSourcePropType[]> = {
  'AI & Machine Learning': [
    require('../../../../assets/category-updates/ai-machine-learning/1.jpg'),
    require('../../../../assets/category-updates/ai-machine-learning/2.jpg'),
    require('../../../../assets/category-updates/ai-machine-learning/3.jpg'),
    require('../../../../assets/category-updates/ai-machine-learning/4.jpg'),
    require('../../../../assets/category-updates/ai-machine-learning/5.jpg'),
  ],
  Development: developmentImages,
  'Cloud & DevOps': [
    require('../../../../assets/category-updates/cloud-devops/1.jpg'),
    require('../../../../assets/category-updates/cloud-devops/2.jpg'),
    require('../../../../assets/category-updates/cloud-devops/3.jpg'),
    require('../../../../assets/category-updates/cloud-devops/4.jpg'),
    require('../../../../assets/category-updates/cloud-devops/5.jpg'),
  ],
  'System Design & Backend': [
    require('../../../../assets/category-updates/system-design-backend/1.jpg'),
    require('../../../../assets/category-updates/system-design-backend/2.jpg'),
    require('../../../../assets/category-updates/system-design-backend/3.jpg'),
    require('../../../../assets/category-updates/system-design-backend/4.jpg'),
    require('../../../../assets/category-updates/system-design-backend/5.jpg'),
  ],
  Cybersecurity: [
    require('../../../../assets/category-updates/cybersecurity/1.jpg'),
    require('../../../../assets/category-updates/cybersecurity/2.jpg'),
    require('../../../../assets/category-updates/cybersecurity/3.jpg'),
    require('../../../../assets/category-updates/cybersecurity/4.jpg'),
    require('../../../../assets/category-updates/cybersecurity/5.jpg'),
  ],
  'Data Science & Analytics': [
    require('../../../../assets/category-updates/data-science-analytics/1.jpg'),
    require('../../../../assets/category-updates/data-science-analytics/2.jpg'),
    require('../../../../assets/category-updates/data-science-analytics/3.jpg'),
    require('../../../../assets/category-updates/data-science-analytics/4.jpg'),
    require('../../../../assets/category-updates/data-science-analytics/5.jpg'),
  ],
  'Product & UI/UX': [
    require('../../../../assets/category-updates/product-ui-ux/1.jpg'),
    require('../../../../assets/category-updates/product-ui-ux/2.jpg'),
    require('../../../../assets/category-updates/product-ui-ux/3.jpg'),
    require('../../../../assets/category-updates/product-ui-ux/4.jpg'),
    require('../../../../assets/category-updates/product-ui-ux/5.jpg'),
  ],
  'Open Source & GitHub': [
    require('../../../../assets/category-updates/open-source-github/1.jpg'),
    require('../../../../assets/category-updates/open-source-github/2.jpg'),
    require('../../../../assets/category-updates/open-source-github/3.jpg'),
    require('../../../../assets/category-updates/open-source-github/4.jpg'),
    require('../../../../assets/category-updates/open-source-github/5.jpg'),
  ],
  'Career & Placements': [
    require('../../../../assets/category-updates/career-placements/1.jpg'),
    require('../../../../assets/category-updates/career-placements/2.jpg'),
    require('../../../../assets/category-updates/career-placements/3.jpg'),
    require('../../../../assets/category-updates/career-placements/4.jpg'),
    require('../../../../assets/category-updates/career-placements/5.jpg'),
  ],
  'Emerging Tech': [
    require('../../../../assets/category-updates/emerging-tech/1.jpg'),
    require('../../../../assets/category-updates/emerging-tech/2.jpg'),
    require('../../../../assets/category-updates/emerging-tech/3.jpg'),
    require('../../../../assets/category-updates/emerging-tech/4.jpg'),
    require('../../../../assets/category-updates/emerging-tech/5.jpg'),
  ],
  'Problem Solving': [
    require('../../../../assets/category-updates/problem-solving/1.jpg'),
    require('../../../../assets/category-updates/problem-solving/2.jpg'),
    require('../../../../assets/category-updates/problem-solving/3.jpg'),
    require('../../../../assets/category-updates/problem-solving/4.jpg'),
    require('../../../../assets/category-updates/problem-solving/5.jpg'),
  ],
};

export function getCategoryUpdateImage(eventId: string, category: string): ImageSourcePropType {
  const images = categoryImages[category] ?? categoryImages['Emerging Tech'];
  let hash = 2166136261;
  const assignmentKey = `${category}:${eventId}`;

  for (let index = 0; index < assignmentKey.length; index += 1) {
    hash = Math.imul(hash ^ assignmentKey.charCodeAt(index), 16777619);
  }

  // The event ID provides a stable pseudo-random assignment without saving image data to the API or database.
  return images[(hash >>> 0) % images.length];
}
