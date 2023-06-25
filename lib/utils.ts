export function flomoDate (daysAgo:number = 0) :string[] {
    const date = new Date();
    const last = new Date(date.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const dd = String(last.getDate()).padStart(2, '0');
    const mm = String(last.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = last.getFullYear().toString();
    return [yyyy, mm, dd]
}