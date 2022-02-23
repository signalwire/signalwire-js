import { useMemberListUpdated } from '../hooks/useRoomSession'

export const MemberList = () => {
  const data = useMemberListUpdated()

  console.log('React > MemberList > data', data);

  return <>Member List</>
}
