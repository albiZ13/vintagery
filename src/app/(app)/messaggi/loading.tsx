import { Loader2 } from 'lucide-react'

export default function MessaggiLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-sienna" size={24} />
    </div>
  )
}
