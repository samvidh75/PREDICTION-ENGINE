import { describe, expect, it } from "vitest";
import { ScreenerParser } from "./ScreenerParser";

const fixture = `
<html>
  <head>
    <meta name="sector" content="Financial Services" />
    <meta name="industry" content="Banking" />
  </head>
  <body>
    <h1>HDFC Bank Limited</h1>
    <div>ISIN INE040A01034</div>
    <table>
      <tr><td>P/E</td><td>19.8</td></tr>
      <tr><td>ROE</td><td>15.7</td></tr>
      <tr><td>Debt to Equity</td><td>0.9</td></tr>
    </table>
    <table>
      <tr><th>Holder</th><th>Value</th></tr>
      <tr><td>Promoter</td><td>25.5%</td></tr>
      <tr><td>Institutional</td><td>57.2%</td></tr>
      <tr><td>Public</td><td>17.3%</td></tr>
    </table>
  </body>
</html>
`;

describe("ScreenerParser", () => {
  it("maps sector, industry, pe, and promoter from fixture", () => {
    const parser = new ScreenerParser();
    const result = parser.parseRatiosPage(fixture);
    const shareholding = parser.parseShareholding(fixture);

    expect(result.companyName).toBe("HDFC Bank Limited");
    expect(result.sector).toBe("Financial Services");
    expect(result.industry).toBe("Banking");
    expect(Number(result.ratios["P/E"])).toBeGreaterThan(0);
    expect(shareholding.promoterHolding).toContain("25.5");
  });
});
