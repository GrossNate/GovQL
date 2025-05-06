import { graphql } from "relay-runtime"
import { useLazyLoadQuery } from "react-relay";

const appTestQuery = graphql`
query AppTestQuery {
  voteMany(filter: {votedYea: "Durbin", votedNay: "Duckworth"}) {
    date
    question
    result
  }
}
`;

const IssueRow = ({date, question, result}: {date:string, question: string, result: string}) => {
  return (
    <tr>
      <td>{date}</td>
      <td>{question}</td>
      <td>{result}</td>
    </tr>
  )
}

function App() {

  const {voteMany} = useLazyLoadQuery(appTestQuery, {});
  const data = voteMany ?? [];
  return (
    <>
      <table>
        <tbody>
          {data.map(rowData => <IssueRow key={rowData.date} date={rowData.date} question={rowData.question} result={rowData.result} />)}
        </tbody>
      </table>
    </>
  )
}

export default App
