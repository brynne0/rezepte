import { useParams } from "react-router-dom";

const Recipe = () => {
  const { id } = useParams();
  return (
    <div>
      <p>You have navigated to the {id} recipe</p>
    </div>
  );
};

export default Recipe;
