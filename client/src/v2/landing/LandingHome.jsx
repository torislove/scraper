import React from 'react';
import SinglePageLanding from '@shared/landing/SinglePageLanding';
import { apiBase, suggestSearch } from '../api';
import { useExtension } from '../context/ExtensionContext';
import {
  isMasterRuntime,
  openClientWorkspace,
  openMasterWorkspace,
  openPortalLogin
} from '../utils/editionSwitch';

export default function LandingHome() {
  const { ensureConnected } = useExtension() || {};
  const masterActive = isMasterRuntime();

  return (
    <SinglePageLanding
      apiBase={apiBase || '/api'}
      suggestFn={suggestSearch}
      isMaster={masterActive}
      onOpenClientWorkspace={(nav, path) => openClientWorkspace(nav, path, ensureConnected)}
      onOpenMasterWorkspace={(nav, path) => openMasterWorkspace(nav, path)}
      onOpenPortalLogin={(role, nav, mode) => openPortalLogin(role, nav, mode)}
    />
  );
}
