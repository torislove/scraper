import React from 'react';
import CountryHubPage from '@shared/pages/CountryHubPage';
import { apiBase, suggestSearch } from '../v2/api';

export default function SeoLandingPage() {
  return <CountryHubPage apiBase={apiBase || '/api'} suggestFn={suggestSearch} />;
}
