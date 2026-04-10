import { Link } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';

export function ExternalLink({ href, ...rest }) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          event.preventDefault();

          await openBrowserAsync(href, {
            presentationStyle: 'automatic',
          });
        }
      }}
    />
  );
}