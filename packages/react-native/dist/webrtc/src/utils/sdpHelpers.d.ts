/**
 * Add stereo support hacking the SDP
 * @return the SDP modified
 */
export declare const sdpStereoHack: (sdp: string) => string;
export declare const sdpMediaOrderHack: (answer: string, localOffer: string) => string;
/**
 * Modify the SDP to increase video bitrate
 * @return the SDP modified
 */
export declare const sdpBitrateHack: (sdp: string, max: number, min: number, start: number) => string;
/**
 * Check for srflx, prflx or relay candidates
 * TODO: improve the logic check private/public IP for typ host
 *
 * @param sdp string
 * @returns boolean
 */
export declare const sdpHasValidCandidates: (sdp: string) => boolean;
/**
 * Remove "a=candidate" lines with local candidates
 * https://bloggeek.me/psa-mdns-and-local-ice-candidates-are-coming/
 */
export declare const sdpRemoveLocalCandidates: (sdp: string) => string;
//# sourceMappingURL=sdpHelpers.d.ts.map