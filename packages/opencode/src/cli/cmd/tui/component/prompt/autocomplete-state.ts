export function isAgencyAutocompleteActive(params: { agencySwarmEnabled: boolean; visible: false | "@" | "/" }) {
  return params.agencySwarmEnabled && params.visible === "@"
}
