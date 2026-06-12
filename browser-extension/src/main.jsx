import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(
  <MantineProvider defaultColorScheme="light">
    <Notifications position="top-center" />
    <App />
  </MantineProvider>,
);
