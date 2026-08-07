import { supabase } from '#lib/sClient'

import type { PageServerLoad  } from './$types'

type Instrument = {
  id: number
  name: string
}

export const load: PageServerLoad = async () => {
  const { data, error } = await supabase.from('instruments').select<'instruments', Instrument>()

  if (error) {
    console.error('Error loading instruments:', error.message)
    return { instruments: [] }
  }

  return {
    instruments: data ?? [],
  }
}