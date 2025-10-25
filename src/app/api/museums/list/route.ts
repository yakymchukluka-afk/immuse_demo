import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch museums from the official Ukrainian museum portal
    const response = await fetch("https://museum.mcsc.gov.ua/museums", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImmuseBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract museum names from the HTML using regex
    const museumRegex = /<h[1-6][^>]*>([^<]+(?:музей|Музей|заповідник|Заповідник|галерея|Галерея)[^<]*)<\/h[1-6]>/gi;
    const museums = [];
    let match;

    while ((match = museumRegex.exec(html)) !== null) {
      const museumName = match[1].trim();
      if (museumName && museumName.length > 10 && museumName.length < 200) {
        museums.push(museumName);
      }
    }

    // Remove duplicates and limit to 20
    const uniqueMuseums = [...new Set(museums)].slice(0, 20);

    // If we couldn't extract from the portal, use a fallback list
    if (uniqueMuseums.length === 0) {
      const fallbackMuseums = [
        "Національний музей історії України",
        "Національний музей мистецтв імені Богдана та Варвари Ханенків",
        "Національний музей народного мистецтва Гуцульщини та Покуття імені Й. Кобринського",
        "Національний заповідник \"Києво-Печерська лавра\"",
        "Національний музей \"Чорнобиль\"",
        "Полтавський краєзнавчий музей імені Василя Кричевського",
        "Державний музей авіації імені О.К. Антонова",
        "Одеський історико-краєзнавчий музей",
        "Хмельницький обласний художній музей",
        "Львівський історичний музей",
        "Чернівецький обласний краєзнавчий музей",
        "Дніпровський історичний музей імені Д.І. Яворницького",
        "Запорізький обласний краєзнавчий музей",
        "Харківський історичний музей",
        "Київський музей народного декоративного мистецтва",
        "Музей історії Києва",
        "Національний музей українського народного декоративного мистецтва",
        "Музей гетьманства",
        "Музей книги та друкарства України",
        "Музей театрального, музичного та кіномистецтва України"
      ];
      return NextResponse.json(fallbackMuseums);
    }

    return NextResponse.json(uniqueMuseums);

  } catch (error) {
    console.error("Error fetching museums:", error);
    
    // Fallback list if API fails
    const fallbackMuseums = [
      "Національний музей історії України",
      "Національний музей мистецтв імені Богдана та Варвари Ханенків",
      "Національний музей народного мистецтва Гуцульщини та Покуття імені Й. Кобринського",
      "Національний заповідник \"Києво-Печерська лавра\"",
      "Національний музей \"Чорнобиль\"",
      "Полтавський краєзнавчий музей імені Василя Кричевського",
      "Державний музей авіації імені О.К. Антонова",
      "Одеський історико-краєзнавчий музей",
      "Хмельницький обласний художній музей",
      "Львівський історичний музей",
      "Чернівецький обласний краєзнавчий музей",
      "Дніпровський історичний музей імені Д.І. Яворницького",
      "Запорізький обласний краєзнавчий музей",
      "Харківський історичний музей",
      "Київський музей народного декоративного мистецтва",
      "Музей історії Києва",
      "Національний музей українського народного декоративного мистецтва",
      "Музей гетьманства",
      "Музей книги та друкарства України",
      "Музей театрального, музичного та кіномистецтва України"
    ];
    
    return NextResponse.json(fallbackMuseums);
  }
}
