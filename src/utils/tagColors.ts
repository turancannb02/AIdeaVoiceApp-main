export const tagColors = {
  'General': { bg: '#E3F2FD', text: '#1976D2' },
  'Task': { bg: '#F3E5F5', text: '#7B1FA2' },
  'Reminder': { bg: '#E8F5E9', text: '#388E3C' },
  'Note': { bg: '#FFF3E0', text: '#F57C00' },
  'Idea': { bg: '#F3E5F5', text: '#8E24AA' },
  'Meeting': { bg: '#E1F5FE', text: '#0288D1' },
  'Personal': { bg: '#FCE4EC', text: '#C2185B' },
  'Work': { bg: '#EFEBE9', text: '#5D4037' },
};

export const getTagColor = (tag: string) => {
  const colors = tagColors[tag as keyof typeof tagColors];
  if (colors) return colors;
  
  // Generate consistent color for unknown tags
  const hash = tag.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const hue = hash % 360;
  return {
    bg: `hsl(${hue}, 85%, 95%)`,
    text: `hsl(${hue}, 85%, 35%)`
  };
}; 