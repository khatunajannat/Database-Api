import ImportantDate from '../models/importantDate.js';

const autoDatesFor = (c) => [
  {
    category: 'form',
    title: `${c.university} (${c.unit}): Applications open`,
    date: c.publishedDate,
  },
  {
    category: 'deadline',
    title: `${c.university} (${c.unit}): Application deadline`,
    date: c.applyDeadline,
  },
  {
    category: 'exam',
    title: `${c.university} (${c.unit}): Admission exam`,
    date: c.examDate,
  },
];

export async function syncCircularDates(circular) {
  for (const d of autoDatesFor(circular)) {
    const filter = { circular: circular._id, category: d.category, auto: true };

    if (!d.date) {
      await ImportantDate.deleteOne(filter);
      continue;
    }

    await ImportantDate.findOneAndUpdate(
      filter,
      {
        ...filter,
        title: d.title,
        date: d.date,
        university: circular.university,
        type: circular.type,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export async function removeCircularDates(circularId) {
  await ImportantDate.deleteMany({ circular: circularId });
}