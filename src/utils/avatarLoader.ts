import * as FileSystem from 'expo-file-system';

const avatars = {
  1: require('../assets/avatars/doodle1.png'),
  2: require('../assets/avatars/doodle2.png'),
  3: require('../assets/avatars/doodle3.png'),
  4: require('../assets/avatars/doodle4.png'),
  5: require('../assets/avatars/doodle5.png'),
  6: require('../assets/avatars/doodle6.png'),
  7: require('../assets/avatars/doodle7.png'),
  8: require('../assets/avatars/doodle8.png'),
  9: require('../assets/avatars/doodle9.png'),
};

export const getAvatarUri = (index: number) => {
  return avatars[((index % 9) + 1) as keyof typeof avatars];
}; 