/**
 * LoginV2.jsx — Master Command Center Login (DRY wrapper around shared client LoginV2).
 */
import React from 'react';
import ClientLoginV2 from '../../../client/src/v2/LoginV2.jsx';

export default function MasterLoginV2(props) {
  return <ClientLoginV2 variant="master" {...props} />;
}
