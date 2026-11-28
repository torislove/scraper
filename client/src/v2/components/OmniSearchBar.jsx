import React from 'react';
import OmniSearchBarShared from '@shared/search/OmniSearchBar';
import { suggestSearch } from '../api';

export default function OmniSearchBar(props) {
  return <OmniSearchBarShared suggestFn={suggestSearch} {...props} />;
}
