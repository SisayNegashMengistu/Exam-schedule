import { ScheduleDashboard } from '@/components/schedule-dashboard'
import { AppProvider } from '@/lib/store'

export default function Page() {
  return <AppProvider><ScheduleDashboard /></AppProvider>
}
